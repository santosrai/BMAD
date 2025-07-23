import { CompiledStateGraph } from "@langchain/langgraph";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { 
  createWorkflowGraph, 
  defaultLangGraphConfig, 
  validateWorkflowConfig,
  type WorkflowState,
  WorkflowStateAnnotation
} from "./workflowConfig";
import type { 
  AIWorkflowResult, 
  ConversationContext, 
  LangGraphConfig,
  WorkflowStatus,
  AIOrchestrator
} from "../../types/aiWorkflow";

export class LangGraphWorkflowEngine implements AIOrchestrator {
  private config: LangGraphConfig;
  private compiledGraph: CompiledStateGraph<typeof WorkflowStateAnnotation, any, any> | null = null;
  private activeWorkflows: Map<string, WorkflowStatus> = new Map();
  private workflowCounter = 0;
  private initializationPromise: Promise<void>;

  constructor(config?: Partial<LangGraphConfig>) {
    this.config = { ...defaultLangGraphConfig, ...config };
    // Override with user's API key if provided
    if (config?.apiKey) {
      this.config.apiKey = config.apiKey;
      // Only log once to reduce noise
      if (!this.constructor.prototype._logged) {
        console.log('WorkflowEngine: API key provided in config:', config.apiKey ? '***' + config.apiKey.slice(-4) : 'empty');
        this.constructor.prototype._logged = true;
      }
    } else {
      if (!this.constructor.prototype._logged) {
        console.log('WorkflowEngine: No API key provided in config');
        this.constructor.prototype._logged = true;
      }
    }
    this.initializationPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Only log initialization once to reduce noise
      if (!this.constructor.prototype._initLogged) {
        console.log('Starting LangGraph workflow engine initialization...');
        this.constructor.prototype._initLogged = true;
      }
      
      if (!validateWorkflowConfig(this.config)) {
        console.error('Config validation failed!');
        throw new Error('Invalid LangGraph configuration');
      }

      try {
        const graph = createWorkflowGraph();
        this.compiledGraph = graph.compile();
        
        if (!this.constructor.prototype._compiledLogged) {
          console.log('✓ Workflow graph compiled successfully');
          this.constructor.prototype._compiledLogged = true;
        }
      } catch (graphError) {
        console.error('Graph creation/compilation failed:', graphError);
        console.error('Graph error stack:', graphError instanceof Error ? graphError.stack : graphError);
        throw new Error(`Graph compilation failed: ${graphError instanceof Error ? graphError.message : 'Unknown error'}`);
      }
      
      if (!this.constructor.prototype._successLogged) {
        console.log('LangGraph workflow engine initialized successfully');
        this.constructor.prototype._successLogged = true;
      }
    } catch (error) {
      console.error('Failed to initialize LangGraph workflow engine:', error);
      console.error('Error details:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : error);
      this.compiledGraph = null; // Ensure it's null on failure
      // Don't re-throw, just log and continue with null graph
      // throw error;
    }
  }

  async processMessage(
    message: string, 
    context: ConversationContext
  ): Promise<AIWorkflowResult> {
    // Wait for initialization to complete
    await this.initializationPromise;
    
    const startTime = Date.now();
    
    if (!this.compiledGraph) {
      console.warn('Workflow engine not initialized, returning fallback response');
      // Return a fallback response instead of throwing
      const workflowId = this.generateWorkflowId();
      return {
        workflowId,
        response: "I'm having trouble with my advanced processing capabilities. Let me give you a basic response.",
        actions: [],
        newContext: {},
        suggestedFollowUps: ['Try a different question', 'Rephrase your request'],
        metadata: {
          tokensUsed: 0,
          duration: Date.now() - startTime,
          toolsInvoked: [],
          confidence: 0.3,
          sources: []
        },
        status: 'completed'
      };
    }

    const workflowId = this.generateWorkflowId();

    try {
      // Create workflow status tracking
      const workflowStatus: WorkflowStatus = {
        id: workflowId,
        status: 'running',
        progress: 0,
        currentStep: 'input_analysis',
        totalSteps: 4,
        startTime,
        errors: [],
        results: []
      };
      
      this.activeWorkflows.set(workflowId, workflowStatus);

      // Prepare initial state
      const initialState: WorkflowState = {
        messages: [new HumanMessage(message)],
        context,
        currentStep: 'input_analysis',
        completedSteps: [],
        pendingActions: [],
        metadata: {
          workflowId,
          version: '1.0',
          createdAt: startTime,
          updatedAt: startTime,
          userId: context.user.id,
          sessionId: context.session.id,
          totalSteps: 4,
          currentStepIndex: 0,
          performance: {
            totalTokens: 0,
            totalDuration: 0,
            apiCalls: 0,
            cacheHits: 0
          }
        },
        errors: []
      };

      // Execute the workflow
      const result = await this.executeWorkflowWithState(initialState, workflowStatus);
      
      // Update final status
      workflowStatus.status = 'completed';
      workflowStatus.endTime = Date.now();
      workflowStatus.progress = 100;
      
      return result;

    } catch (error) {
      const workflowStatus = this.activeWorkflows.get(workflowId);
      if (workflowStatus) {
        workflowStatus.status = 'failed';
        workflowStatus.endTime = Date.now();
        workflowStatus.errors.push({
          id: `error_${Date.now()}`,
          timestamp: Date.now(),
          type: 'api_error',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
          step: workflowStatus.currentStep,
          recoverable: false,
          retryCount: 0,
          maxRetries: this.config.retryAttempts
        });
      }

      // Return error result
      return {
        workflowId,
        response: 'I encountered an error processing your request. Please try again.',
        actions: [],
        newContext: {},
        suggestedFollowUps: ['Try rephrasing your question', 'Check if the molecular structure is loaded'],
        metadata: {
          tokensUsed: 0,
          duration: Date.now() - startTime,
          toolsInvoked: [],
          confidence: 0,
          sources: []
        },
        status: 'failed'
      };
    }
  }

  // Remove the private executeWorkflow method and merge its logic into the public one
  async executeWorkflow(workflowType: string, parameters: any): Promise<AIWorkflowResult> {
    // Wait for initialization to complete
    await this.initializationPromise;
    
    // Implementation for specific workflow types
    const workflowConfig = this.config.workflows.find(w => w.name === workflowType);
    if (!workflowConfig) {
      throw new Error(`Workflow type '${workflowType}' not found`);
    }

    // For now, delegate to message processing with workflow-specific context
    const context: ConversationContext = {
      molecular: parameters.molecular || {},
      user: parameters.user || {},
      session: {
        ...(parameters.session || {}),
        topicsDiscussed: Array.isArray(parameters.session?.topicsDiscussed) ? parameters.session.topicsDiscussed : [],
        toolsUsed: Array.isArray(parameters.session?.toolsUsed) ? parameters.session.toolsUsed : [],
      },
      tools: parameters.tools || {}
    };

    // Prepare initial state
    const initialState: WorkflowState = {
      messages: [new HumanMessage(parameters.message || "")],
      context,
      currentStep: 'input_analysis',
      completedSteps: [],
      pendingActions: [],
      metadata: {
        workflowId: `workflow_${Date.now()}`,
        version: '1.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: context.user.id,
        sessionId: context.session.id,
        totalSteps: 4,
        currentStepIndex: 0,
        performance: {
          totalTokens: 0,
          totalDuration: 0,
          apiCalls: 0,
          cacheHits: 0
        }
      },
      errors: []
    };

    // Delegate to the private method that handles state execution
    return await this.executeWorkflowWithState(initialState, { 
      id: initialState.metadata.workflowId, 
      status: 'running', 
      progress: 0, 
      currentStep: 'execution', 
      totalSteps: 1, 
      startTime: Date.now(), 
      errors: [], 
      results: [] 
    });
  }

  // Private method to execute workflow with state
  private async executeWorkflowWithState(initialState: WorkflowState, workflowStatus: WorkflowStatus): Promise<AIWorkflowResult> {
    const startTime = Date.now();
    
    if (!this.compiledGraph) {
      console.warn('Workflow graph not compiled, returning fallback response');
      return {
        workflowId: initialState.metadata.workflowId,
        response: "I'm having trouble processing your request with advanced features. Let me provide a basic response instead.",
        actions: [],
        newContext: {},
        suggestedFollowUps: ['Try rephrasing your question', 'Ask a simpler question'],
        metadata: {
          tokensUsed: 0,
          duration: Date.now() - startTime,
          toolsInvoked: [],
          confidence: 0.5,
          sources: []
        },
        status: 'completed'
      };
    }

    let finalState: WorkflowState;
    try {
      // Execute the compiled graph
      const result = await this.compiledGraph.invoke(initialState);
      finalState = result as WorkflowState;
    } catch (error) {
      console.error('Workflow execution error:', error);
      throw error;
    }

    // Extract response from metadata
    const response = finalState.metadata?.response || 'I processed your request.';
    const toolsInvoked = finalState.metadata?.selectedTools || [];
    const duration = Date.now() - startTime;

    // Build AI response message
    const aiMessage = new AIMessage(response);
    finalState.messages.push(aiMessage);

    // Create workflow result
    const workflowResult: AIWorkflowResult = {
      workflowId: initialState.metadata.workflowId,
      response,
      actions: [], // You may want to extract actions from finalState if available
      newContext: {}, // You may want to extract context updates from finalState if available
      suggestedFollowUps: [], // You may want to generate follow-ups from finalState if available
      metadata: {
        tokensUsed: finalState.metadata?.performance?.totalTokens || 0,
        duration,
        toolsInvoked,
        confidence: 0.8,
        sources: []
      },
      status: 'completed'
    };

    return workflowResult;
  }

  async getWorkflowStatus(workflowId: string): Promise<WorkflowStatus> {
    const status = this.activeWorkflows.get(workflowId);
    if (!status) {
      throw new Error(`Workflow '${workflowId}' not found`);
    }
    return { ...status };
  }

  async cancelWorkflow(workflowId: string): Promise<boolean> {
    const status = this.activeWorkflows.get(workflowId);
    if (!status) {
      return false;
    }

    if (status.status === 'running') {
      status.status = 'cancelled';
      status.endTime = Date.now();
      return true;
    }

    return false;
  }

  async updateContext(updates: Partial<ConversationContext>): Promise<void> {
    // Context updates would be handled by the consuming application
    // This method provides the interface for context management
    console.log('Context updates received:', updates);
  }

  async getAvailableTools(): Promise<any[]> {
    return this.config.tools.filter(tool => tool.enabled);
  }

  async executeToolChain(tools: string[], parameters: any[]): Promise<any> {
    // Implementation for executing a chain of tools
    const results = [];
    
    for (let i = 0; i < tools.length; i++) {
      const toolName = tools[i];
      const toolParams = parameters[i] || {};
      
      try {
        const result = await this.executeTool(toolName, toolParams);
        results.push({
          id: `tool_${i}_${Date.now()}`,
          toolName,
          timestamp: Date.now(),
          input: toolParams,
          output: result,
          duration: 0, // Would be measured in real implementation
          success: true,
          context: `Tool chain execution step ${i + 1}`
        });
      } catch (error) {
        results.push({
          id: `tool_${i}_${Date.now()}`,
          toolName,
          timestamp: Date.now(),
          input: toolParams,
          output: null,
          duration: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          context: `Tool chain execution step ${i + 1}`
        });
        break; // Stop on first error
      }
    }

    return {
      chainId: `chain_${Date.now()}`,
      results,
      finalOutput: results.length > 0 ? results[results.length - 1].output : null,
      success: results.every(r => r.success),
      duration: results.reduce((sum, r) => sum + r.duration, 0),
      errors: results.filter(r => !r.success).map(r => ({
        id: r.id,
        timestamp: r.timestamp,
        type: 'tool_error' as const,
        message: r.error || 'Tool execution failed',
        details: r,
        step: r.toolName,
        recoverable: true,
        retryCount: 0,
        maxRetries: 3
      })),
      metadata: {
        toolCount: tools.length,
        totalTokens: 0,
        cacheHits: 0
      }
    };
  }

  private async executeTool(toolName: string, parameters: any): Promise<any> {
    // Placeholder for actual tool execution
    // In real implementation, this would call the appropriate tool handler
    console.log(`Executing tool: ${toolName} with parameters:`, parameters);
    
    switch (toolName) {
      case 'molecular_analysis':
        return { analysis: 'Mock molecular analysis result', confidence: 0.9 };
      case 'viewer_control':
        return { action: 'performed', status: 'success' };
      case 'pdb_search':
        return { results: ['1ABC', '2DEF'], count: 2 };
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private generateWorkflowId(): string {
    return `workflow_${++this.workflowCounter}_${Date.now()}`;
  }

  private extractContextUpdates(state: WorkflowState): Partial<ConversationContext> {
    // Extract context updates from the final workflow state
    return {
      session: {
        ...state.context.session,
        messageCount: state.messages.length,
        topicsDiscussed: [
          ...state.context.session.topicsDiscussed,
          ...(state.metadata?.inputAnalysis?.intent ? [state.metadata.inputAnalysis.intent] : [])
        ],
        toolsUsed: [
          ...state.context.session.toolsUsed,
          ...(state.metadata?.selectedTools || [])
        ]
      }
    };
  }

  private generateFollowUps(state: WorkflowState): string[] {
    const intent = state.metadata?.inputAnalysis?.intent;
    const hasStructure = !!state.context.molecular.currentStructure;
    
    const followUps: string[] = [];
    
    if (intent === 'search_and_load' && !hasStructure) {
      followUps.push('Load a molecular structure to analyze');
    }
    
    if (intent === 'analysis' && hasStructure) {
      followUps.push('Explore specific residues or binding sites');
      followUps.push('Compare with similar structures');
    }
    
    if (intent === 'viewer_control') {
      followUps.push('Adjust visualization settings');
      followUps.push('Save current view state');
    }
    
    // Default follow-ups
    if (followUps.length === 0) {
      followUps.push('Ask about molecular properties');
      followUps.push('Search for related structures');
      followUps.push('Analyze binding sites');
    }
    
    return followUps;
  }

  private extractSources(state: WorkflowState): string[] {
    const sources: string[] = [];
    
    if (state.context.molecular.currentStructure) {
      sources.push(`PDB: ${state.context.molecular.currentStructure.id}`);
    }
    
    if (state.metadata?.selectedTools?.includes('pdb_search')) {
      sources.push('RCSB PDB Database');
    }
    
    if (state.metadata?.selectedTools?.includes('molecular_analysis')) {
      sources.push('Molecular Analysis Tools');
    }
    
    return sources;
  }

  // Utility methods for configuration management
  updateConfig(updates: Partial<LangGraphConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Re-initialize if needed
    if (updates.workflows || updates.tools) {
      this.initialize();
    }
  }

  getConfig(): LangGraphConfig {
    return { ...this.config };
  }

  // Health check and diagnostics
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const isConfigValid = validateWorkflowConfig(this.config);
      const isGraphCompiled = !!this.compiledGraph;
      
      return {
        status: isConfigValid && isGraphCompiled ? 'healthy' : 'degraded',
        details: {
          configValid: isConfigValid,
          graphCompiled: isGraphCompiled,
          activeWorkflows: this.activeWorkflows.size,
          availableTools: this.config.tools.filter(t => t.enabled).length
        }
      };
    } catch (error) {
      return {
        status: 'error',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  // Add this method for interface compatibility
  async cleanup(): Promise<void> {
      // No resources to clean up yet
  }
}

// Singleton instance for global use
let workflowEngineInstance: LangGraphWorkflowEngine | null = null;

export function getWorkflowEngine(config?: Partial<LangGraphConfig>): LangGraphWorkflowEngine {
  if (!workflowEngineInstance) {
    workflowEngineInstance = new LangGraphWorkflowEngine(config);
  }
  return workflowEngineInstance;
}

// Force reset for development - this ensures fresh initialization
export function forceResetWorkflowEngine(): void {
  if (workflowEngineInstance) {
    workflowEngineInstance = null;
  }
}

export function resetWorkflowEngine(): void {
  workflowEngineInstance = null;
}