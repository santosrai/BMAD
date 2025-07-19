// OpenRouter API validation and client setup

export interface ApiKeyValidationResult {
  isValid: boolean;
  error?: string;
  errorType?: 'network' | 'auth' | 'invalid_key' | 'rate_limit' | 'unknown';
}

export interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  architecture: {
    modality: string;
    tokenizer: string;
    instruct_type?: string;
  };
  top_provider: {
    context_length: number;
    max_completion_tokens: number;
  };
}

export interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }>;
}

export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenRouterChatRequest {
  model: string;
  messages: OpenRouterMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  stop?: string[];
}

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl: string = 'https://openrouter.ai/api/v1';
  private defaultHeaders: Record<string, string>;

  constructor(apiKey: string, options?: { baseUrl?: string }) {
    this.apiKey = apiKey;
    if (options?.baseUrl) {
      this.baseUrl = options.baseUrl;
    }
    this.defaultHeaders = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://bioai.dev',
      'X-Title': 'BioAI Workspace'
    };
  }

  async getModels(): Promise<OpenRouterModel[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: this.defaultHeaders
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data || [];
  }

  async createChatCompletion(request: OpenRouterChatRequest): Promise<OpenRouterResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify({
        ...request,
        stream: false
      })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter API error: ${response.status} - ${error.error?.message || 'Unknown error'}`);
    }
    
    return response.json();
  }

  async createChatCompletionStream(request: OpenRouterChatRequest): Promise<ReadableStream<OpenRouterStreamChunk>> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify({
        ...request,
        stream: true
      })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter API error: ${response.status} - ${error.error?.message || 'Unknown error'}`);
    }
    
    if (!response.body) {
      throw new Error('No response body received');
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    return new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              controller.close();
              break;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  controller.close();
                  return;
                }
                
                try {
                  const parsed = JSON.parse(data);
                  controller.enqueue(parsed);
                } catch (e) {
                  console.warn('Failed to parse SSE chunk:', data);
                }
              }
            }
          }
        } catch (error) {
          controller.error(error);
        }
      }
    });
  }

  async estimateTokens(text: string): Promise<number> {
    // Simple token estimation (1 token ≈ 4 characters for most models)
    return Math.ceil(text.length / 4);
  }

  async calculateCost(model: string, promptTokens: number, completionTokens: number): Promise<number> {
    const models = await this.getModels();
    const modelInfo = models.find(m => m.id === model);
    
    if (!modelInfo) {
      return 0;
    }
    
    const promptCost = (promptTokens / 1000000) * parseFloat(modelInfo.pricing.prompt);
    const completionCost = (completionTokens / 1000000) * parseFloat(modelInfo.pricing.completion);
    
    return promptCost + completionCost;
  }
}

// Validate OpenRouter API key format
export function validateApiKeyFormat(apiKey: string): { isValid: boolean; error?: string } {
  if (!apiKey || typeof apiKey !== 'string') {
    return { isValid: false, error: 'API key is required' };
  }

  const trimmedKey = apiKey.trim();
  
  if (trimmedKey.length === 0) {
    return { isValid: false, error: 'API key cannot be empty' };
  }

  // Basic format validation for OpenRouter API keys
  // OpenRouter keys typically start with 'sk-or-' and are 64+ characters
  if (!trimmedKey.startsWith('sk-or-')) {
    return { 
      isValid: false, 
      error: 'OpenRouter API keys should start with "sk-or-"' 
    };
  }

  if (trimmedKey.length < 20) {
    return { 
      isValid: false, 
      error: 'API key appears to be too short. Please check your key.' 
    };
  }

  return { isValid: true };
}

// Test OpenRouter API key by making a minimal API call
export async function validateApiKeyConnectivity(apiKey: string): Promise<ApiKeyValidationResult> {
  // First, validate the format
  const formatValidation = validateApiKeyFormat(apiKey);
  if (!formatValidation.isValid) {
    return {
      isValid: false,
      error: formatValidation.error,
      errorType: 'invalid_key'
    };
  }

  try {
    // Make a minimal API call to OpenRouter to test the key
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://bioai.dev',
        'X-Title': 'BioAI Workspace'
      },
    });

    if (response.ok) {
      return { isValid: true };
    }

    // Handle different error cases
    if (response.status === 401) {
      return {
        isValid: false,
        error: 'Invalid API key. Please check your OpenRouter API key.',
        errorType: 'auth'
      };
    }

    if (response.status === 429) {
      return {
        isValid: false,
        error: 'Rate limit exceeded. Please try again later.',
        errorType: 'rate_limit'
      };
    }

    if (response.status >= 500) {
      return {
        isValid: false,
        error: 'OpenRouter service is temporarily unavailable. Please try again later.',
        errorType: 'network'
      };
    }

    return {
      isValid: false,
      error: `API validation failed with status ${response.status}`,
      errorType: 'unknown'
    };

  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        isValid: false,
        error: 'Network error. Please check your internet connection and try again.',
        errorType: 'network'
      };
    }

    return {
      isValid: false,
      error: 'An unexpected error occurred while validating the API key.',
      errorType: 'unknown'
    };
  }
}

// Get error guidance for users based on error type
export function getApiKeyErrorGuidance(errorType?: string): string {
  switch (errorType) {
    case 'auth':
      return 'Double-check your API key from your OpenRouter account settings. Make sure you copied the entire key.';
    case 'invalid_key':
      return 'Please ensure you are using a valid OpenRouter API key starting with "sk-or-".';
    case 'network':
      return 'Check your internet connection. If the problem persists, OpenRouter may be experiencing issues.';
    case 'rate_limit':
      return 'You have exceeded the rate limit. Please wait a few minutes before trying again.';
    default:
      return 'Please verify your API key and try again. If the problem persists, contact OpenRouter support.';
  }
}

// Factory function to create OpenRouter client with validation
export async function createOpenRouterClient(apiKey: string): Promise<OpenRouterClient> {
  const validation = await validateApiKeyConnectivity(apiKey);
  
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid API key');
  }
  
  return new OpenRouterClient(apiKey);
}

// Helper function to format OpenRouter models for UI
export function formatModelForUI(model: OpenRouterModel) {
  return {
    id: model.id,
    name: model.name,
    provider: 'openrouter' as const,
    pricing: {
      input: parseFloat(model.pricing.prompt),
      output: parseFloat(model.pricing.completion)
    },
    contextLength: model.context_length,
    maxTokens: model.top_provider.max_completion_tokens,
    capabilities: {
      streaming: true,
      functionCalling: model.architecture.instruct_type === 'function',
      vision: model.architecture.modality.includes('image')
    }
  };
}