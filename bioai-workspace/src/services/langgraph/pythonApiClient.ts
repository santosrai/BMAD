/**
 * Python LangGraph API Client
 * Handles communication with the Python microservice
 */

import type { 
  AIWorkflowResult, 
  LangGraphConfig,
  WorkflowStatus 
} from "../../types/aiWorkflow";

export interface PythonWorkflowRequest {
  workflowType: string;
  parameters: any;
  apiKey?: string;
}

export interface PythonWorkflowResponse {
  workflow_id: string;
  status: string;
  result?: any;
  error?: string;
  started_at: string;
  completed_at?: string;
}

export interface PythonApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export class PythonLangGraphApiClient {
  private config: PythonApiConfig;
  private requestCounter = 0;

  constructor(config?: Partial<PythonApiConfig>) {
    this.config = {
      baseUrl: process.env.PYTHON_LANGGRAPH_SERVICE_URL || "http://localhost:8000",
      timeout: 30000, // 30 seconds
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
      ...config
    };

    console.log('Python LangGraph API Client initialized:', {
      baseUrl: this.config.baseUrl,
      timeout: this.config.timeout
    });
  }

  /**
   * Execute workflow via Python microservice
   */
  async executeWorkflow(
    workflowType: string, 
    parameters: any,
    apiKey?: string
  ): Promise<AIWorkflowResult> {
    const requestId = ++this.requestCounter;
    
    console.log(`[${requestId}] Executing workflow via Python API:`, {
      workflowType,
      hasApiKey: !!apiKey,
      parametersKeys: Object.keys(parameters || {})
    });

    try {
      const request: PythonWorkflowRequest = {
        workflowType,
        parameters: {
          ...parameters,
          // Pass through API key for OpenRouter calls
          apiKey: apiKey
        },
        apiKey
      };

      const response = await this.makeRequest(
        '/api/v1/workflow/execute',
        'POST',
        request,
        requestId
      );

      console.log(`[${requestId}] 🔍 RAW PYTHON RESPONSE:`, JSON.stringify(response, null, 2));

      // Transform Python response to expected format
      const result = this.transformPythonResponse(response, workflowType);
      
      console.log(`[${requestId}] 🔄 TRANSFORMED RESULT:`, JSON.stringify(result, null, 2));
      
      console.log(`[${requestId}] Workflow completed successfully:`, {
        workflowType,
        status: result.status,
        workflowId: result.workflowId,
        response: result.response
      });

      return result;

    } catch (error) {
      console.error(`[${requestId}] Workflow execution failed:`, {
        workflowType,
        error: error instanceof Error ? error.message : String(error)
      });

      console.log(`[${requestId}] 🚨 THROWING ERROR FOR HYBRID ENGINE FALLBACK`);
      // IMPORTANT: Throw the error so hybrid engine can fallback to TypeScript
      // Don't return a result here, let the hybrid engine handle the fallback
      throw error;
    }
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId: string): Promise<WorkflowStatus | null> {
    try {
      const response = await this.makeRequest(
        `/api/v1/workflow/status/${workflowId}`,
        'GET'
      );

      return {
        id: response.workflow_id,
        status: response.status,
        progress: 0, // No progress info from API
        currentStep: response.current_step || '',
        totalSteps: 1, // Default to 1 if not provided
        startTime: Date.parse(response.started_at) || Date.now(),
        endTime: response.completed_at ? Date.parse(response.completed_at) : undefined,
        errors: [],
        results: []
      };

    } catch (error) {
      console.warn('Failed to get workflow status:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Stop workflow execution
   */
  async stopWorkflow(workflowId: string): Promise<boolean> {
    try {
      await this.makeRequest(
        `/api/v1/workflow/stop/${workflowId}`,
        'POST'
      );
      return true;

    } catch (error) {
      console.warn('Failed to stop workflow:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Check service health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health/live`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout for health check
      });

      return response.ok;

    } catch (error) {
      console.warn('Python service health check failed:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any,
    requestId?: number
  ): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const options: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'convex-langgraph-client/1.0',
            ...(requestId && { 'X-Request-ID': requestId.toString() })
          },
          signal: AbortSignal.timeout(this.config.timeout),
          ...(body && { body: JSON.stringify(body) })
        };

        if (requestId) {
          console.log(`[${requestId}] Attempt ${attempt}/${this.config.retryAttempts}: ${method} ${url}`);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return data;

      } catch (error) {
        lastError = error as Error;
        
        if (requestId) {
          console.warn(`[${requestId}] Attempt ${attempt} failed:`, error instanceof Error ? error.message : String(error));
        }

        // Don't retry on timeout or abort errors
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          break;
        }

        // Wait before retry (except on last attempt)
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }

    throw lastError;
  }

  /**
   * Transform Python API response to expected TypeScript format
   */
  private transformPythonResponse(
    pythonResponse: PythonWorkflowResponse,
    workflowType: string
  ): AIWorkflowResult {
    console.log('🔄 TRANSFORMING PYTHON RESPONSE:', {
      pythonResponse_keys: Object.keys(pythonResponse || {}),
      status: pythonResponse?.status,
      workflow_id: pythonResponse?.workflow_id,
      result_keys: pythonResponse?.result ? Object.keys(pythonResponse.result) : 'no result',
      result_type: typeof pythonResponse?.result,
      result_preview: pythonResponse?.result ? JSON.stringify(pythonResponse.result).substring(0, 200) + '...' : 'null'
    });

    // If error, return a valid AIWorkflowResult with all required fields
    if (pythonResponse.status === 'error') {
      console.log('❌ ERROR STATUS - returning error result');
      return {
        workflowId: pythonResponse.workflow_id,
        response: pythonResponse.error || 'An error occurred in the Python workflow.',
        actions: [],
        newContext: {},
        suggestedFollowUps: [],
        metadata: {
          tokensUsed: 0,
          duration: 0,
          toolsInvoked: [],
          confidence: 0,
          sources: []
        },
        status: 'failed'
      };
    }

    // Normal case (map fields from pythonResponse.result)
    // Python service returns result with {response, actions, newContext, suggestedFollowUps, metadata}
    console.log('✅ SUCCESS STATUS - extracting response from result');
    console.log('🔍 Result details:', {
      'result.response': pythonResponse.result?.response,
      'result.actions': pythonResponse.result?.actions,
      'result.newContext': pythonResponse.result?.newContext,
      'result.suggestedFollowUps': pythonResponse.result?.suggestedFollowUps,
      'result.metadata': pythonResponse.result?.metadata
    });

    const transformedResult = {
      workflowId: pythonResponse.workflow_id,
      response: pythonResponse.result?.response || 'Workflow completed',  // Fixed: use .response not .content
      actions: pythonResponse.result?.actions || [],
      newContext: pythonResponse.result?.newContext || {},  // Fixed: use .newContext not .data
      suggestedFollowUps: pythonResponse.result?.suggestedFollowUps || [],  // Fixed: use direct field not nested
      metadata: {
        tokensUsed: pythonResponse.result?.metadata?.tokensUsed || 0,
        duration: pythonResponse.result?.metadata?.duration || 0,
        toolsInvoked: pythonResponse.result?.metadata?.toolsInvoked || [],
        confidence: pythonResponse.result?.metadata?.confidence || 1,
        sources: pythonResponse.result?.metadata?.sources || []
      },
      status: 'completed'
    };

    console.log('📤 FINAL TRANSFORMED RESULT:', {
      workflowId: transformedResult.workflowId,
      response: transformedResult.response,
      response_length: transformedResult.response?.length || 0,
      status: transformedResult.status,
      hasActions: transformedResult.actions?.length > 0,
      hasFollowUps: transformedResult.suggestedFollowUps?.length > 0
    });

    return transformedResult;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create Python API client instance
 */
export function createPythonApiClient(config?: Partial<PythonApiConfig>): PythonLangGraphApiClient {
  return new PythonLangGraphApiClient(config);
}