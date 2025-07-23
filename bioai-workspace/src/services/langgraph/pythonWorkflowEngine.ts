/**
 * Python Workflow Engine
 * Routes workflows to Python microservice only
 * Provides health monitoring and error handling
 */

import { PythonLangGraphApiClient, createPythonApiClient } from "./pythonApiClient";
import type { 
  AIWorkflowResult, 
  ConversationContext, 
  LangGraphConfig,
  WorkflowStatus,
  AIOrchestrator
} from "../../types/aiWorkflow";

export interface HybridEngineConfig extends LangGraphConfig {
  usePythonService?: boolean;
  pythonServiceUrl?: string;
  pythonTimeout?: number;
  healthCheckInterval?: number;
}

export interface ServiceHealthStatus {
  pythonService: boolean;
  lastHealthCheck: Date;
  failureCount: number;
}

export class HybridWorkflowEngine implements AIOrchestrator {
  private pythonClient: PythonLangGraphApiClient;
  private config: HybridEngineConfig;
  private healthStatus: ServiceHealthStatus;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(config?: Partial<HybridEngineConfig>) {
    // Check for user-configured backend URL first
    const userBackendUrl = typeof window !== 'undefined' ? 
      localStorage.getItem('bioai_backend_url') : null;
    
    this.config = {
      usePythonService: true, // Default to Python service
      pythonServiceUrl: userBackendUrl || 
        process.env.PYTHON_LANGGRAPH_SERVICE_URL || 
        "http://localhost:8000",
      pythonTimeout: 30000,
      healthCheckInterval: 60000, // Check every minute
      ...config
    };
    
    // Initialize Python API client
    this.pythonClient = createPythonApiClient({
      baseUrl: this.config.pythonServiceUrl,
      timeout: this.config.pythonTimeout
    });

    // Initialize health status
    this.healthStatus = {
      pythonService: false,
      lastHealthCheck: new Date(),
      failureCount: 0
    };

    console.log('Python Workflow Engine initialized:', {
      usePythonService: this.config.usePythonService,
      pythonServiceUrl: this.config.pythonServiceUrl,
      configSource: userBackendUrl ? 'user-configured' : 'environment/default'
    });

    // Start health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Execute workflow with intelligent routing
   */
  async executeWorkflow(
    workflowType: string,
    parameters: any,
    context?: ConversationContext
  ): Promise<AIWorkflowResult> {
    const startTime = Date.now();
    
    const shouldUsePython = this.shouldUsePythonService(workflowType);
    
    console.log('🚀 Python Engine: Workflow Execution Decision:', {
      workflowType,
      shouldUsePython,
      configUsePythonService: this.config.usePythonService,
      pythonServiceHealthy: this.healthStatus.pythonService,
      pythonFailureCount: this.healthStatus.failureCount,
      decision: shouldUsePython ? '🐍 USING PYTHON SERVICE' : '⚠️ PYTHON SERVICE UNAVAILABLE'
    });

    // Decide which service to use
    if (this.shouldUsePythonService(workflowType)) {
      try {
        const result = await this.executePythonWorkflow(workflowType, parameters, context);
        
        // Mark Python service as healthy on success
        this.healthStatus.pythonService = true;
        this.healthStatus.failureCount = 0;
        
        const duration = Date.now() - startTime;
        console.log(`Hybrid Engine: Python workflow completed in ${duration}ms`);
        
        return result;

      } catch (error) {
        console.error('🐍❌ Hybrid Engine: Python workflow failed:', error.message);
        
        // Update health status
        this.healthStatus.pythonService = false;
        this.healthStatus.failureCount++;

        // Return error directly when Python service fails
        console.error('❌ Hybrid Engine: Python service unavailable');
        throw new Error('Python service is currently unavailable. Please try again later or contact support.');
      }
    } else {
      // Python service is not available for this workflow
      throw new Error('Python service is required for this workflow but is currently unavailable. Please try again later or contact support.');
    }
  }

  /**
   * Execute workflow using Python microservice
   */
  private async executePythonWorkflow(
    workflowType: string,
    parameters: any,
    context?: ConversationContext
  ): Promise<AIWorkflowResult> {
    // Enhance parameters with context if available
    const enhancedParameters = {
      ...parameters,
      context: context ? {
        sessionId: context.sessionId,
        userId: context.userId,
        currentStructures: context.currentStructures,
        conversationHistory: context.conversationHistory,
        userPreferences: context.userPreferences
      } : undefined
    };

    return await this.pythonClient.executeWorkflow(
      workflowType,
      enhancedParameters,
      this.config.apiKey
    );
  }


  /**
   * Determine if Python service should be used for this workflow
   */
  private shouldUsePythonService(workflowType: string): boolean {
    // Don't use Python if explicitly disabled
    if (!this.config.usePythonService) {
      return false;
    }

    // Don't use Python if it's been failing repeatedly
    if (this.healthStatus.failureCount >= 3) {
      console.warn('Python Engine: Python service has failed repeatedly');
      return false;
    }

    // Python service is required for all workflows
    return true;
  }

  /**
   * Get workflow status from Python service
   */
  async getWorkflowStatus(workflowId: string): Promise<WorkflowStatus | null> {
    // Try Python service only
    if (this.healthStatus.pythonService) {
      return await this.pythonClient.getWorkflowStatus(workflowId);
    }

    throw new Error('Python service is unavailable. Cannot get workflow status.');
  }

  /**
   * Stop workflow in Python service
   */
  async stopWorkflow(workflowId: string): Promise<boolean> {
    // Try Python service only
    if (this.healthStatus.pythonService) {
      return await this.pythonClient.stopWorkflow(workflowId);
    }

    throw new Error('Python service is unavailable. Cannot stop workflow.');
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Initial health check
    this.performHealthCheck();

    // Schedule regular health checks
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check on services
   */
  private async performHealthCheck(): Promise<void> {
    try {
      // Check Python service health
      const pythonHealthy = await this.pythonClient.checkHealth();
      
      this.healthStatus = {
        ...this.healthStatus,
        pythonService: pythonHealthy,
        lastHealthCheck: new Date()
      };

      // Reset failure count if Python service is healthy
      if (pythonHealthy) {
        this.healthStatus.failureCount = 0;
      }

      console.log('Python Engine: Health check completed:', {
        pythonService: pythonHealthy,
        failureCount: this.healthStatus.failureCount
      });

    } catch (error) {
      console.warn('Python Engine: Health check failed:', error.message);
      this.healthStatus.pythonService = false;
    }
  }

  /**
   * Get current service health status
   */
  getHealthStatus(): ServiceHealthStatus {
    return { ...this.healthStatus };
  }

  /**
   * Force reconnect to Python service (if healthy)
   */
  async reconnectToPythonService(): Promise<boolean> {
    const healthy = await this.pythonClient.checkHealth();
    if (healthy) {
      this.config.usePythonService = true;
      this.healthStatus.pythonService = true;
      this.healthStatus.failureCount = 0;
      console.log('Python Engine: Reconnected to Python service');
      return true;
    }
    return false;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    console.log('Python Engine: Cleaned up');
  }
}

/**
 * Create Python workflow engine instance
 */
export function createPythonWorkflowEngine(config?: Partial<HybridEngineConfig>): HybridWorkflowEngine {
  return new HybridWorkflowEngine(config);
}