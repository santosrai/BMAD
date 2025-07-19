// AI Workflow Hook for State Management
// React hook for managing AI workflow state and interactions

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useRunWorkflow } from '../services/useRunWorkflow';
import type { 
  AIWorkflowResult, 
  ConversationContext, 
  WorkflowStatus,
  AIWorkflowHookReturn,
  AIWorkflowHookState,
  AIWorkflowHookActions,
  WorkflowHistoryEntry,
  ToolChainResult,
  AvailableTool
} from '../types/aiWorkflow';

interface UseAIWorkflowOptions {
  userId: string;
  sessionId: string;
  apiKey?: string;
  autoSave?: boolean;
  contextPersistence?: boolean;
}

export const useAIWorkflow = (options: UseAIWorkflowOptions): AIWorkflowHookReturn => {
  const { userId, sessionId, apiKey, autoSave = true, contextPersistence = true } = options;
  
  // State management
  const [state, setState] = useState<AIWorkflowHookState>({
    isProcessing: false,
    currentWorkflow: undefined,
    activeWorkflows: new Map(),
    context: {
      molecular: {
        currentStructure: undefined,
        selectedResidues: [],
        viewerState: {
          camera: undefined,
          representations: [],
          selections: [],
          zoom: 1.0,
          center: [0, 0, 0]
        },
        analysisResults: [],
        searchHistory: []
      },
      user: {
        id: userId,
        preferences: {
          analysisDepth: 'intermediate',
          outputFormat: 'detailed',
          visualizations: true,
          notifications: true
        },
        expertise: {
          level: 'intermediate',
          domains: [],
          interests: []
        },
        researchGoals: [],
        currentProject: undefined
      },
      session: {
        id: sessionId,
        startTime: Date.now(),
        duration: 0,
        messageCount: 0,
        topicsDiscussed: [],
        toolsUsed: [],
        keyFindings: [],
        followUpActions: []
      },
      tools: {
        availableTools: [],
        toolHistory: [],
        activeOperations: [],
        preferences: {
          timeout: 30000,
          retryAttempts: 3,
          parallelExecutions: 2,
          priorityOrder: ['molecular_analysis', 'viewer_control', 'pdb_search'],
          autoRetry: true
        }
      }
    },
    error: undefined,
    lastResult: undefined,
    workflowHistory: []
  });

  // Convex mutations and queries
  const createWorkflow = useMutation(api.aiWorkflows.createWorkflow);
  const updateWorkflowProgress = useMutation(api.aiWorkflows.updateWorkflowProgress);
  const completeWorkflow = useMutation(api.aiWorkflows.completeWorkflow);
  const storeWorkflowResult = useMutation(api.aiWorkflows.storeWorkflowResult);
  const addWorkflowHistory = useMutation(api.aiWorkflows.addWorkflowHistory);
  const updateConversationContext = useMutation(api.aiWorkflows.updateConversationContext);
  
  const conversationContext = useQuery(api.aiWorkflows.getConversationContext, { userId, sessionId });
  const workflowHistory = useQuery(api.aiWorkflows.getWorkflowHistory, { userId, sessionId, limit: 50 });
  const activeWorkflows = useQuery(api.aiWorkflows.getActiveWorkflows, { userId });

  // Orchestrator reference
  const runWorkflow = useRunWorkflow();

  // Initialize context from Convex
  useEffect(() => {
    if (conversationContext && contextPersistence) {
      setState(prev => ({
        ...prev,
        context: {
          ...prev.context,
          molecular: {
            ...prev.context.molecular,
            ...conversationContext.context.molecularState
          },
          user: {
            ...prev.context.user,
            preferences: {
              ...prev.context.user.preferences,
              ...conversationContext.context.userPreferences
            }
          },
          session: {
            ...prev.context.session,
            ...conversationContext.context.sessionSummary
          }
        }
      }));
    }
  }, [conversationContext, contextPersistence]);

  // Load workflow history
  useEffect(() => {
    if (workflowHistory) {
      const historyEntries: WorkflowHistoryEntry[] = workflowHistory.map(entry => ({
        id: entry.workflowId,
        timestamp: entry.timestamp,
        userMessage: entry.userMessage,
        aiResponse: entry.aiResponse,
        actions: entry.actions,
        context: entry.context,
        metadata: entry.metadata
      }));
      
      setState(prev => ({
        ...prev,
        workflowHistory: historyEntries
      }));
    }
  }, [workflowHistory]);

  // Update active workflows
  useEffect(() => {
    if (activeWorkflows) {
      const workflowMap = new Map<string, WorkflowStatus>();
      activeWorkflows.forEach(workflow => {
        workflowMap.set(workflow.workflowId, {
          id: workflow.workflowId,
          status: workflow.status,
          progress: workflow.progress,
          currentStep: workflow.currentStep,
          totalSteps: workflow.totalSteps,
          startTime: workflow.startTime,
          endTime: workflow.endTime,
          estimatedCompletion: workflow.estimatedCompletion,
          errors: [],
          results: []
        });
      });
      
      setState(prev => ({
        ...prev,
        activeWorkflows: workflowMap
      }));
    }
  }, [activeWorkflows]);

  // Auto-save context
  useEffect(() => {
    if (autoSave && contextPersistence) {
      const timeoutId = setTimeout(() => {
        updateConversationContext({
          userId,
          sessionId,
          context: {
            lastUpdated: Date.now(),
            molecularState: {
              activeStructure: state.context.molecular.currentStructure?.id,
              selectedElements: state.context.molecular.selectedResidues.map(r => 
                `${r.chainId}:${r.residueNumber}`
              ),
              viewerSettings: state.context.molecular.viewerState,
              analysisResults: state.context.molecular.analysisResults,
              searchHistory: state.context.molecular.searchHistory
            },
            userPreferences: {
              expertiseLevel: state.context.user.expertise.level,
              preferredFormat: state.context.user.preferences.outputFormat,
              domains: state.context.user.expertise.domains,
              analysisDepth: state.context.user.preferences.analysisDepth,
              visualizations: state.context.user.preferences.visualizations,
              notifications: state.context.user.preferences.notifications
            },
            sessionSummary: {
              mainTopics: state.context.session.topicsDiscussed,
              completedAnalyses: state.context.molecular.analysisResults.map(r => r.id),
              pendingTasks: state.context.session.followUpActions,
              keyInsights: state.context.session.keyFindings,
              toolsUsed: state.context.session.toolsUsed,
              messageCount: state.context.session.messageCount,
              duration: state.context.session.duration
            }
          }
        }).catch(console.error);
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [state.context, autoSave, contextPersistence, userId, sessionId, updateConversationContext]);

  // Process message through AI workflow
  const processMessage = useCallback(async (message: string): Promise<AIWorkflowResult> => {
    setState(prev => ({ ...prev, isProcessing: true, error: undefined }));
    
    try {
      // Create workflow tracking
      const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await createWorkflow({
        workflowId,
        userId,
        sessionId,
        workflowType: 'message_processing',
        totalSteps: 5,
        metadata: {
          version: '1.0.0',
          performance: {
            totalTokens: 0,
            totalDuration: 0,
            apiCalls: 0,
            cacheHits: 0
          }
        }
      });

      // Process through orchestrator
      const result = await runWorkflow('conversation_processing', { message }, apiKey);
      
      // Store result
      await storeWorkflowResult({
        workflowId,
        userId,
        sessionId,
        result
      });

      // Add to history
      await addWorkflowHistory({
        userId,
        sessionId,
        workflowId,
        userMessage: message,
        aiResponse: result.response,
        actions: result.actions,
        context: result.newContext,
        metadata: result.metadata
      });

      // Complete workflow
      await completeWorkflow({
        workflowId,
        status: result.status === 'failed' ? 'failed' : 'completed',
        finalMetadata: {
          version: '1.0.0',
          performance: {
            totalTokens: result.metadata.tokensUsed,
            totalDuration: result.metadata.duration,
            apiCalls: 1,
            cacheHits: 0
          }
        }
      });

      // Update local state
      setState(prev => ({
        ...prev,
        isProcessing: false,
        lastResult: result,
        context: {
          ...prev.context,
          ...result.newContext,
          session: {
            ...prev.context.session,
            messageCount: prev.context.session.messageCount + 1,
            duration: Date.now() - prev.context.session.startTime,
            toolsUsed: [...prev.context.session.toolsUsed, ...result.metadata.toolsInvoked],
            topicsDiscussed: [...prev.context.session.topicsDiscussed, ...result.metadata.sources]
          }
        }
      }));

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: errorMessage 
      }));
      
      throw error;
    }
  }, [state.context, userId, sessionId, apiKey, createWorkflow, storeWorkflowResult, addWorkflowHistory, completeWorkflow, runWorkflow]);

  // Execute specific workflow
  const executeWorkflow = useCallback(async (type: string, params: any): Promise<AIWorkflowResult> => {
    setState(prev => ({ ...prev, isProcessing: true, error: undefined }));
    
    try {
      const result = await runWorkflow(type, params, apiKey);
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        lastResult: result
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: errorMessage 
      }));
      
      throw error;
    }
  }, [runWorkflow, apiKey]);

  // Update context
  const updateContext = useCallback((updates: Partial<ConversationContext>) => {
    setState(prev => ({
      ...prev,
      context: {
        ...prev.context,
        ...updates
      }
    }));
  }, []);

  // Cancel workflow
  const cancelWorkflow = useCallback(async (workflowId: string): Promise<boolean> => {
    try {
      // This functionality needs to be implemented via Convex mutations
      // For now, we'll just remove it from active workflows
      setState(prev => ({
        ...prev,
        activeWorkflows: new Map([...prev.activeWorkflows].filter(([id]) => id !== workflowId))
      }));
      return true; // Indicate cancellation attempt
    } catch (error) {
      console.error('Failed to cancel workflow:', error);
      return false;
    }
  }, []);

  // Retry last workflow
  const retryLastWorkflow = useCallback(async (): Promise<AIWorkflowResult> => {
    if (!state.lastResult) {
      throw new Error('No previous workflow to retry');
    }

    const lastHistoryEntry = state.workflowHistory[0];
    if (!lastHistoryEntry) {
      throw new Error('No workflow history available');
    }

    return await processMessage(lastHistoryEntry.userMessage);
  }, [state.lastResult, state.workflowHistory, processMessage]);

  // Clear history
  const clearHistory = useCallback(() => {
    setState(prev => ({
      ...prev,
      workflowHistory: [],
      lastResult: undefined
    }));
  }, []);

  // Export workflow history
  const exportWorkflowHistory = useCallback((format: 'json' | 'csv' | 'markdown'): string => {
    const history = state.workflowHistory;
    
    switch (format) {
      case 'json':
        return JSON.stringify(history, null, 2);
      
      case 'csv':
        const csvHeaders = 'Timestamp,User Message,AI Response,Tools Used,Duration\n';
        const csvRows = history.map(entry => [
          new Date(entry.timestamp).toISOString(),
          `"${entry.userMessage.replace(/"/g, '""')}"`,
          `"${entry.aiResponse.replace(/"/g, '""')}"`,
          `"${entry.metadata.toolsUsed.join(', ')}"`,
          entry.metadata.duration
        ].join(',')).join('\n');
        return csvHeaders + csvRows;
      
      case 'markdown':
        return history.map(entry => `
## ${new Date(entry.timestamp).toLocaleString()}

**User:** ${entry.userMessage}

**AI:** ${entry.aiResponse}

**Tools Used:** ${entry.metadata.toolsUsed.join(', ')}
**Duration:** ${entry.metadata.duration}ms
**Tokens:** ${entry.metadata.tokensUsed}

---`).join('\n');
      
      default:
        return JSON.stringify(history, null, 2);
    }
  }, [state.workflowHistory]);

  // Get available tools
  const getAvailableTools = useCallback(async (): Promise<AvailableTool[]> => {
    // This functionality needs to be implemented via Convex queries or a dedicated endpoint
    // For now, return an empty array or fetch from backend if available
    return [];
  }, []);

  // Execute tool chain
  const executeToolChain = useCallback(async (tools: string[], parameters: any[]): Promise<ToolChainResult> => {
    // This functionality needs to be implemented via Convex mutations
    // For now, return a placeholder or throw an error
    console.warn('executeToolChain is not yet implemented via Convex mutations.');
    return { success: false, message: 'Tool chain execution not yet supported via Convex mutations.' };
  }, []);

  // Actions object
  const actions: AIWorkflowHookActions = {
    processMessage,
    executeWorkflow,
    updateContext,
    cancelWorkflow,
    retryLastWorkflow,
    clearHistory,
    exportWorkflowHistory
  };

  // Extended actions for advanced functionality
  const extendedActions = {
    ...actions,
    getAvailableTools,
    executeToolChain,
    updateApiKey: (newApiKey: string) => {
      // This functionality needs to be implemented via Convex mutations
      console.warn('updateApiKey is not yet implemented via Convex mutations.');
    },
    getOrchestratorHealth: async () => {
      // This functionality needs to be implemented via Convex queries or a dedicated endpoint
      console.warn('getOrchestratorHealth is not yet implemented via Convex queries.');
      return { status: 'offline', message: 'Health check not available via Convex.' };
    }
  };

  return {
    state,
    actions: extendedActions
  };
};

// Custom hook for specific workflow types
export const useMolecularAnalysis = (userId: string, sessionId: string, apiKey?: string) => {
  const workflow = useAIWorkflow({ userId, sessionId, apiKey });
  
  const analyzeMolecule = useCallback(async (structureId: string, analysisType: string) => {
    return await workflow.actions.executeWorkflow('molecular_analysis_workflow', {
      structureId,
      analysisType,
      user: workflow.state.context.user,
      molecular: workflow.state.context.molecular,
      session: workflow.state.context.session
    });
  }, [workflow]);

  const searchPDB = useCallback(async (query: string, filters?: any) => {
    return await workflow.actions.executeWorkflow('pdb_search_workflow', {
      query,
      filters,
      user: workflow.state.context.user,
      session: workflow.state.context.session
    });
  }, [workflow]);

  const controlViewer = useCallback(async (action: string, parameters: any) => {
    return await workflow.actions.executeWorkflow('viewer_control_workflow', {
      action,
      parameters,
      molecular: workflow.state.context.molecular,
      user: workflow.state.context.user
    });
  }, [workflow]);

  return {
    ...workflow,
    analyzeMolecule,
    searchPDB,
    controlViewer
  };
};

// Export default hook
export default useAIWorkflow;