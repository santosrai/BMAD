import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { ConvexReactClient } from 'convex/react';

// Interface for workflow context state
export interface WorkflowContextState {
  workflowId: string;
  sessionId: string;
  userId: string;
  currentStep: string;
  totalSteps: number;
  progress: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  
  // Context data
  conversationMemory: {
    recentMessages: any[];
    entityMemory: Map<string, any>;
    topicHistory: string[];
    userPreferences: any;
    contextWindow: number;
  };
  
  // Tool states
  toolStates: {
    [toolName: string]: {
      lastUsed: number;
      configuration: any;
      results: any[];
      errors: any[];
      metrics: {
        invocations: number;
        successRate: number;
        avgDuration: number;
      };
    };
  };
  
  // Workflow execution state
  executionState: {
    currentNode: string;
    nodeHistory: string[];
    branchingHistory: any[];
    variables: Map<string, any>;
    pendingActions: any[];
    completedActions: any[];
  };
  
  // Molecular context
  molecularContext: {
    activeStructures: string[];
    analysisResults: any[];
    searchHistory: string[];
    viewerState: any;
    selectedElements: string[];
    measurements: any[];
    annotations: any[];
  };
  
  // Performance metrics
  metrics: {
    startTime: number;
    endTime?: number;
    duration: number;
    tokensUsed: number;
    apiCalls: number;
    cacheHits: number;
    toolInvocations: number;
    errorCount: number;
  };
}

// Interface for workflow action
export interface WorkflowAction {
  id: string;
  type: string;
  description: string;
  parameters: any;
  result?: any;
  timestamp: number;
  duration: number;
  success: boolean;
  error?: string;
  metadata: any;
}

// Interface for workflow persistence options
export interface WorkflowPersistenceOptions {
  autoSave: boolean;
  saveInterval: number;
  compressContextAfter: number;
  maxContextSize: number;
  snapshotFrequency: number;
}

export class WorkflowContextManager {
  private convexClient: ConvexReactClient;
  private workflowStates: Map<string, WorkflowContextState> = new Map();
  private persistenceOptions: WorkflowPersistenceOptions;
  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();
  private compressionThreshold: number = 1024 * 1024; // 1MB

  constructor(
    convexClient: ConvexReactClient,
    options: Partial<WorkflowPersistenceOptions> = {}
  ) {
    this.convexClient = convexClient;
    this.persistenceOptions = {
      autoSave: true,
      saveInterval: 10000, // 10 seconds
      compressContextAfter: 100, // After 100 messages
      maxContextSize: 5 * 1024 * 1024, // 5MB
      snapshotFrequency: 50, // Every 50 actions
      ...options,
    };
  }

  // Initialize workflow context
  async initializeWorkflow(
    workflowId: string,
    userId: string,
    sessionId: string,
    workflowType: string,
    totalSteps: number = 1
  ): Promise<WorkflowContextState> {
    const now = Date.now();
    
    // Create initial context state
    const contextState: WorkflowContextState = {
      workflowId,
      sessionId,
      userId,
      currentStep: 'initialization',
      totalSteps,
      progress: 0,
      status: 'running',
      conversationMemory: {
        recentMessages: [],
        entityMemory: new Map(),
        topicHistory: [],
        userPreferences: {},
        contextWindow: 20,
      },
      toolStates: {},
      executionState: {
        currentNode: 'start',
        nodeHistory: ['start'],
        branchingHistory: [],
        variables: new Map(),
        pendingActions: [],
        completedActions: [],
      },
      molecularContext: {
        activeStructures: [],
        analysisResults: [],
        searchHistory: [],
        viewerState: null,
        selectedElements: [],
        measurements: [],
        annotations: [],
      },
      metrics: {
        startTime: now,
        duration: 0,
        tokensUsed: 0,
        apiCalls: 0,
        cacheHits: 0,
        toolInvocations: 0,
        errorCount: 0,
      },
    };

    // Store in memory
    this.workflowStates.set(workflowId, contextState);

    // Create workflow in database
    await this.convexClient.mutation(api.aiWorkflows.createWorkflow, {
      workflowId,
      userId,
      sessionId,
      workflowType,
      totalSteps,
      metadata: {
        version: '1.0',
        performance: {
          totalTokens: 0,
          totalDuration: 0,
          apiCalls: 0,
          cacheHits: 0,
        },
      },
    });

    // Start auto-save if enabled
    if (this.persistenceOptions.autoSave) {
      this.startAutoSave(workflowId);
    }

    return contextState;
  }

  // Update workflow progress
  async updateWorkflowProgress(
    workflowId: string,
    progress: number,
    currentStep: string,
    estimatedCompletion?: number
  ): Promise<void> {
    const contextState = this.workflowStates.get(workflowId);
    if (!contextState) {
      throw new Error(`Workflow ${workflowId} not found in context`);
    }

    // Update in-memory state
    contextState.progress = progress;
    contextState.currentStep = currentStep;
    contextState.executionState.currentNode = currentStep;
    contextState.executionState.nodeHistory.push(currentStep);

    // Update in database
    await this.convexClient.mutation(api.aiWorkflows.updateWorkflowProgress, {
      workflowId,
      progress,
      currentStep,
      estimatedCompletion,
      metadata: {
        version: '1.0',
        performance: {
          totalTokens: contextState.metrics.tokensUsed,
          totalDuration: contextState.metrics.duration,
          apiCalls: contextState.metrics.apiCalls,
          cacheHits: contextState.metrics.cacheHits,
        },
      },
    });
  }

  // Add message to conversation memory
  addToConversationMemory(
    workflowId: string,
    message: any,
    extractEntities: boolean = true
  ): void {
    const contextState = this.workflowStates.get(workflowId);
    if (!contextState) return;

    const memory = contextState.conversationMemory;
    
    // Add to recent messages
    memory.recentMessages.push({
      ...message,
      timestamp: Date.now(),
    });

    // Maintain context window
    if (memory.recentMessages.length > memory.contextWindow) {
      memory.recentMessages = memory.recentMessages.slice(-memory.contextWindow);
    }

    // Extract entities if requested
    if (extractEntities) {
      this.extractAndStoreEntities(workflowId, message);
    }

    // Update topic history
    this.updateTopicHistory(workflowId, message);
  }

  // Record tool usage
  recordToolUsage(
    workflowId: string,
    toolName: string,
    parameters: any,
    result: any,
    duration: number,
    success: boolean,
    error?: string
  ): void {
    const contextState = this.workflowStates.get(workflowId);
    if (!contextState) return;

    const now = Date.now();
    
    // Initialize tool state if not exists
    if (!contextState.toolStates[toolName]) {
      contextState.toolStates[toolName] = {
        lastUsed: now,
        configuration: {},
        results: [],
        errors: [],
        metrics: {
          invocations: 0,
          successRate: 0,
          avgDuration: 0,
        },
      };
    }

    const toolState = contextState.toolStates[toolName];
    
    // Update tool state
    toolState.lastUsed = now;
    toolState.results.push({ parameters, result, timestamp: now });
    
    if (error) {
      toolState.errors.push({ error, timestamp: now });
    }

    // Update metrics
    toolState.metrics.invocations++;
    toolState.metrics.avgDuration = 
      (toolState.metrics.avgDuration * (toolState.metrics.invocations - 1) + duration) / 
      toolState.metrics.invocations;
    
    const successCount = toolState.results.filter(r => r.result && !r.error).length;
    toolState.metrics.successRate = successCount / toolState.metrics.invocations;

    // Update workflow metrics
    contextState.metrics.toolInvocations++;
    if (!success) {
      contextState.metrics.errorCount++;
    }

    // Keep only recent results (last 50)
    if (toolState.results.length > 50) {
      toolState.results = toolState.results.slice(-50);
    }
  }

  // Record workflow action
  recordWorkflowAction(workflowId: string, action: WorkflowAction): void {
    const contextState = this.workflowStates.get(workflowId);
    if (!contextState) return;

    // Add to completed actions
    contextState.executionState.completedActions.push(action);

    // Remove from pending actions if it was pending
    contextState.executionState.pendingActions = 
      contextState.executionState.pendingActions.filter(a => a.id !== action.id);

    // Update workflow metrics
    contextState.metrics.duration = Date.now() - contextState.metrics.startTime;
    if (action.metadata?.tokensUsed) {
      contextState.metrics.tokensUsed += action.metadata.tokensUsed;
    }
    if (action.metadata?.apiCall) {
      contextState.metrics.apiCalls++;
    }
    if (action.metadata?.cacheHit) {
      contextState.metrics.cacheHits++;
    }

    // Auto-save if reaching snapshot frequency
    if (contextState.executionState.completedActions.length % this.persistenceOptions.snapshotFrequency === 0) {
      this.saveWorkflowContext(workflowId);
    }
  }

  // Update molecular context
  updateMolecularContext(
    workflowId: string,
    updates: Partial<WorkflowContextState['molecularContext']>
  ): void {
    const contextState = this.workflowStates.get(workflowId);
    if (!contextState) return;

    // Merge updates
    Object.assign(contextState.molecularContext, updates);

    // Trigger auto-save if significant changes
    if (updates.activeStructures || updates.analysisResults || updates.viewerState) {
      this.debouncedSave(workflowId);
    }
  }

  // Get workflow context
  getWorkflowContext(workflowId: string): WorkflowContextState | null {
    return this.workflowStates.get(workflowId) || null;
  }

  // Get conversation context for AI
  getConversationContext(workflowId: string): any {
    const contextState = this.workflowStates.get(workflowId);
    if (!contextState) return null;

    return {
      recentMessages: contextState.conversationMemory.recentMessages,
      entities: Object.fromEntries(contextState.conversationMemory.entityMemory),
      topics: contextState.conversationMemory.topicHistory,
      userPreferences: contextState.conversationMemory.userPreferences,
      molecularContext: contextState.molecularContext,
      toolStates: contextState.toolStates,
      executionState: contextState.executionState,
    };
  }

  // Save workflow context to database
  async saveWorkflowContext(workflowId: string): Promise<void> {
    const contextState = this.workflowStates.get(workflowId);
    if (!contextState) return;

    // Convert Maps to objects for serialization
    const serializableContext = {
      lastUpdated: Date.now(),
      molecularState: contextState.molecularContext,
      userPreferences: contextState.conversationMemory.userPreferences,
      sessionSummary: {
        mainTopics: contextState.conversationMemory.topicHistory,
        completedAnalyses: contextState.executionState.completedActions
          .filter(a => a.type === 'analysis')
          .map(a => a.description),
        pendingTasks: contextState.executionState.pendingActions
          .map(a => a.description),
        keyInsights: this.extractKeyInsights(contextState),
        toolsUsed: Object.keys(contextState.toolStates),
        messageCount: contextState.conversationMemory.recentMessages.length,
        duration: contextState.metrics.duration,
      },
    };

    // Update conversation context in database
    await this.convexClient.mutation(api.aiWorkflows.updateConversationContext, {
      userId: contextState.userId,
      sessionId: contextState.sessionId,
      context: serializableContext,
    });
  }

  // Complete workflow
  async completeWorkflow(
    workflowId: string,
    result: any,
    status: 'completed' | 'failed' | 'cancelled' = 'completed'
  ): Promise<void> {
    const contextState = this.workflowStates.get(workflowId);
    if (!contextState) return;

    const now = Date.now();
    
    // Update context state
    contextState.status = status;
    contextState.progress = status === 'completed' ? 100 : contextState.progress;
    contextState.metrics.endTime = now;
    contextState.metrics.duration = now - contextState.metrics.startTime;

    // Stop auto-save
    this.stopAutoSave(workflowId);

    // Save final context
    await this.saveWorkflowContext(workflowId);

    // Complete workflow in database
    await this.convexClient.mutation(api.aiWorkflows.completeWorkflow, {
      workflowId,
      status,
      finalMetadata: {
        version: '1.0',
        performance: {
          totalTokens: contextState.metrics.tokensUsed,
          totalDuration: contextState.metrics.duration,
          apiCalls: contextState.metrics.apiCalls,
          cacheHits: contextState.metrics.cacheHits,
        },
      },
    });

    // Store workflow result
    if (result) {
      await this.convexClient.mutation(api.aiWorkflows.storeWorkflowResult, {
        workflowId,
        userId: contextState.userId,
        sessionId: contextState.sessionId,
        result,
      });
    }

    // Add to workflow history
    await this.convexClient.mutation(api.aiWorkflows.addWorkflowHistory, {
      userId: contextState.userId,
      sessionId: contextState.sessionId,
      workflowId,
      userMessage: contextState.conversationMemory.recentMessages
        .filter(m => m.type === 'user')
        .slice(-1)[0]?.content || '',
      aiResponse: result?.response || '',
      actions: contextState.executionState.completedActions,
      context: this.getConversationContext(workflowId),
      metadata: {
        duration: contextState.metrics.duration,
        tokensUsed: contextState.metrics.tokensUsed,
        toolsUsed: Object.keys(contextState.toolStates),
      },
    });

    // Clean up from memory
    this.workflowStates.delete(workflowId);
  }

  // Restore workflow context from database
  async restoreWorkflowContext(workflowId: string, userId: string): Promise<WorkflowContextState | null> {
    try {
      // Get workflow from database
      const workflow = await this.convexClient.query(api.aiWorkflows.getWorkflowStatus, {
        workflowId,
      });

      if (!workflow || workflow.userId !== userId) {
        return null;
      }

      // Get conversation context
      const conversationContext = await this.convexClient.query(api.aiWorkflows.getConversationContext, {
        userId,
        sessionId: workflow.sessionId,
      });

      // Reconstruct context state
      const contextState: WorkflowContextState = {
        workflowId,
        sessionId: workflow.sessionId,
        userId,
        currentStep: workflow.currentStep,
        totalSteps: workflow.totalSteps,
        progress: workflow.progress,
        status: workflow.status,
        conversationMemory: {
          recentMessages: [],
          entityMemory: new Map(),
          topicHistory: conversationContext?.context?.sessionSummary?.mainTopics || [],
          userPreferences: conversationContext?.context?.userPreferences || {},
          contextWindow: 20,
        },
        toolStates: {},
        executionState: {
          currentNode: workflow.currentStep,
          nodeHistory: [workflow.currentStep],
          branchingHistory: [],
          variables: new Map(),
          pendingActions: [],
          completedActions: [],
        },
        molecularContext: conversationContext?.context?.molecularState || {
          activeStructures: [],
          analysisResults: [],
          searchHistory: [],
          viewerState: null,
          selectedElements: [],
          measurements: [],
          annotations: [],
        },
        metrics: {
          startTime: workflow.startTime,
          endTime: workflow.endTime,
          duration: workflow.endTime ? workflow.endTime - workflow.startTime : Date.now() - workflow.startTime,
          tokensUsed: workflow.metadata?.performance?.totalTokens || 0,
          apiCalls: workflow.metadata?.performance?.apiCalls || 0,
          cacheHits: workflow.metadata?.performance?.cacheHits || 0,
          toolInvocations: 0,
          errorCount: 0,
        },
      };

      // Store in memory
      this.workflowStates.set(workflowId, contextState);

      // Restart auto-save if workflow is still running
      if (contextState.status === 'running' && this.persistenceOptions.autoSave) {
        this.startAutoSave(workflowId);
      }

      return contextState;
    } catch (error) {
      console.error('Failed to restore workflow context:', error);
      return null;
    }
  }

  // Private helper methods
  private extractAndStoreEntities(workflowId: string, message: any): void {
    const contextState = this.workflowStates.get(workflowId);
    if (!contextState) return;

    // Simple entity extraction (can be enhanced with NLP)
    const entities = this.extractEntities(message.content);
    
    entities.forEach(entity => {
      const existing = contextState.conversationMemory.entityMemory.get(entity.name);
      if (existing) {
        existing.count++;
        existing.lastMentioned = Date.now();
      } else {
        contextState.conversationMemory.entityMemory.set(entity.name, {
          type: entity.type,
          count: 1,
          firstMentioned: Date.now(),
          lastMentioned: Date.now(),
        });
      }
    });
  }

  private extractEntities(content: string): Array<{ name: string; type: string }> {
    const entities: Array<{ name: string; type: string }> = [];
    
    // Extract PDB IDs (simple regex)
    const pdbMatches = content.match(/\b[0-9][A-Z0-9]{3}\b/g);
    if (pdbMatches) {
      pdbMatches.forEach(pdb => {
        entities.push({ name: pdb, type: 'pdb_id' });
      });
    }

    // Extract protein names (simple patterns)
    const proteinMatches = content.match(/\b[A-Z][a-z]+ protein\b/g);
    if (proteinMatches) {
      proteinMatches.forEach(protein => {
        entities.push({ name: protein, type: 'protein' });
      });
    }

    return entities;
  }

  private updateTopicHistory(workflowId: string, message: any): void {
    const contextState = this.workflowStates.get(workflowId);
    if (!contextState) return;

    // Simple topic extraction based on keywords
    const topics = this.extractTopics(message.content);
    
    topics.forEach(topic => {
      if (!contextState.conversationMemory.topicHistory.includes(topic)) {
        contextState.conversationMemory.topicHistory.push(topic);
      }
    });

    // Limit topic history size
    if (contextState.conversationMemory.topicHistory.length > 20) {
      contextState.conversationMemory.topicHistory = 
        contextState.conversationMemory.topicHistory.slice(-20);
    }
  }

  private extractTopics(content: string): string[] {
    const topics: string[] = [];
    const topicKeywords = [
      'protein structure', 'molecular analysis', 'binding site', 'enzyme',
      'mutation', 'folding', 'sequence', 'docking', 'visualization',
      'crystallography', 'nmr', 'bioinformatics', 'pharmacology'
    ];

    topicKeywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword)) {
        topics.push(keyword);
      }
    });

    return topics;
  }

  private extractKeyInsights(contextState: WorkflowContextState): string[] {
    const insights: string[] = [];
    
    // Extract insights from completed analyses
    contextState.executionState.completedActions
      .filter(a => a.type === 'analysis' && a.success)
      .forEach(action => {
        if (action.result?.insight) {
          insights.push(action.result.insight);
        }
      });

    // Extract insights from molecular analysis results
    contextState.molecularContext.analysisResults.forEach(result => {
      if (result.insight) {
        insights.push(result.insight);
      }
    });

    return insights.slice(-10); // Keep last 10 insights
  }

  private startAutoSave(workflowId: string): void {
    const timer = setInterval(() => {
      this.saveWorkflowContext(workflowId);
    }, this.persistenceOptions.saveInterval);

    this.autoSaveTimers.set(workflowId, timer);
  }

  private stopAutoSave(workflowId: string): void {
    const timer = this.autoSaveTimers.get(workflowId);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(workflowId);
    }
  }

  private debouncedSave(workflowId: string): void {
    const existingTimer = this.autoSaveTimers.get(`debounced_${workflowId}`);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.saveWorkflowContext(workflowId);
      this.autoSaveTimers.delete(`debounced_${workflowId}`);
    }, 2000);

    this.autoSaveTimers.set(`debounced_${workflowId}`, timer);
  }

  // Cleanup all workflow contexts
  cleanup(): void {
    this.autoSaveTimers.forEach(timer => clearInterval(timer));
    this.autoSaveTimers.clear();
    this.workflowStates.clear();
  }
}

export default WorkflowContextManager;