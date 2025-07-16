// OpenRouter API validation and client setup

export interface ApiKeyValidationResult {
  isValid: boolean;
  error?: string;
  errorType?: 'network' | 'auth' | 'invalid_key' | 'rate_limit' | 'unknown';
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