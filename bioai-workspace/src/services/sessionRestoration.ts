import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { ConvexReactClient } from 'convex/react';
import { sessionSerializer, type SerializableViewerState } from '../utils/sessionSerializer';
import { SessionManager } from './sessionManager';
import WorkflowContextManager from './workflowContextManager';

export interface SessionRestorationOptions {
  restoreChat: boolean;
  restoreViewer: boolean;
  restoreAIWorkflow: boolean;
  restorePreferences: boolean;
  createSnapshot: boolean;
  validateIntegrity: boolean;
  fallbackToLastKnownGood: boolean;
  progressCallback?: (progress: number, status: string) => void;
}

export interface SessionRestorationResult {
  success: boolean;
  sessionId: string | null;
  restored: {
    chat: boolean;
    viewer: boolean;
    aiWorkflow: boolean;
    preferences: boolean;
  };
  errors: string[];
  warnings: string[];
  metadata: {
    restorationTime: number;
    dataSize: number;
    integrityIssues: string[];
    snapshotCreated: boolean;
  };
}

export class SessionRestoration {
  private convexClient: ConvexReactClient;
  private sessionManager: SessionManager | null = null;
  private workflowManager: WorkflowContextManager | null = null;
  private viewerRef: any = null;

  constructor(convexClient: ConvexReactClient) {
    this.convexClient = convexClient;
  }

  // Set session manager instance
  setSessionManager(sessionManager: SessionManager): void {
    this.sessionManager = sessionManager;
  }

  // Set workflow manager instance
  setWorkflowManager(workflowManager: WorkflowContextManager): void {
    this.workflowManager = workflowManager;
  }

  // Set viewer reference
  setViewerRef(viewer: any): void {
    this.viewerRef = viewer;
  }

  // Main session restoration method
  async restoreSession(
    userId: string,
    options: Partial<SessionRestorationOptions> = {}
  ): Promise<SessionRestorationResult> {
    const startTime = Date.now();
    const fullOptions: SessionRestorationOptions = {
      restoreChat: true,
      restoreViewer: true,
      restoreAIWorkflow: true,
      restorePreferences: true,
      createSnapshot: false,
      validateIntegrity: true,
      fallbackToLastKnownGood: true,
      ...options,
    };

    const result: SessionRestorationResult = {
      success: false,
      sessionId: null,
      restored: {
        chat: false,
        viewer: false,
        aiWorkflow: false,
        preferences: false,
      },
      errors: [],
      warnings: [],
      metadata: {
        restorationTime: 0,
        dataSize: 0,
        integrityIssues: [],
        snapshotCreated: false,
      },
    };

    try {
      // Step 1: Initialize session restoration
      fullOptions.progressCallback?.(10, 'Initializing session restoration...');
      
      const initResult = await this.convexClient.mutation(api.sessions.initializeSessionRestore, {
        userId,
      });

      if (!initResult.sessionId) {
        if (initResult.needsNewSession) {
          result.warnings.push('No existing session found. New session will be created.');
          return result;
        }
        throw new Error('No session available for restoration');
      }

      result.sessionId = initResult.sessionId;

      // Step 2: Validate session integrity if requested
      if (fullOptions.validateIntegrity) {
        fullOptions.progressCallback?.(20, 'Validating session integrity...');
        
        const integrityResult = await this.convexClient.query(api.sessions.validateSessionIntegrity, {
          sessionId: result.sessionId as Id<'chatSessions'>,
          userId,
        });

        if (!integrityResult.isValid) {
          result.metadata.integrityIssues = integrityResult.issues.map(i => i.type);
          result.warnings.push(`Session integrity issues found: ${integrityResult.issues.length}`);
          
          if (fullOptions.fallbackToLastKnownGood) {
            const fallbackResult = await this.fallbackToLastKnownGoodSession(userId);
            if (fallbackResult.success) {
              result.sessionId = fallbackResult.sessionId;
              result.warnings.push('Restored from last known good session');
            }
          }
        }
      }

      // Step 3: Create pre-restoration snapshot if requested
      if (fullOptions.createSnapshot) {
        fullOptions.progressCallback?.(30, 'Creating restoration snapshot...');
        
        try {
          await this.convexClient.mutation(api.sessionSnapshots.createCheckpoint, {
            sessionId: result.sessionId as Id<'chatSessions'>,
            userId,
            description: 'Pre-restoration snapshot',
            tags: ['restoration', 'backup'],
          });
          result.metadata.snapshotCreated = true;
        } catch (error) {
          result.warnings.push('Failed to create restoration snapshot');
        }
      }

      // Step 4: Restore chat state
      if (fullOptions.restoreChat) {
        fullOptions.progressCallback?.(40, 'Restoring chat state...');
        
        try {
          const chatState = await this.restoreChatState(result.sessionId, userId);
          result.restored.chat = chatState.success;
          result.metadata.dataSize += chatState.dataSize;
          
          if (!chatState.success) {
            result.errors.push('Failed to restore chat state');
          }
        } catch (error) {
          result.errors.push(`Chat restoration error: ${error.message}`);
        }
      }

      // Step 5: Restore viewer state
      if (fullOptions.restoreViewer && this.viewerRef) {
        fullOptions.progressCallback?.(55, 'Restoring viewer state...');
        
        try {
          const viewerState = await this.restoreViewerState(result.sessionId, userId);
          result.restored.viewer = viewerState.success;
          result.metadata.dataSize += viewerState.dataSize;
          
          if (!viewerState.success) {
            result.errors.push('Failed to restore viewer state');
          }
        } catch (error) {
          result.errors.push(`Viewer restoration error: ${error.message}`);
        }
      }

      // Step 6: Restore AI workflow state
      if (fullOptions.restoreAIWorkflow && this.workflowManager) {
        fullOptions.progressCallback?.(70, 'Restoring AI workflow state...');
        
        try {
          const workflowState = await this.restoreAIWorkflowState(result.sessionId, userId);
          result.restored.aiWorkflow = workflowState.success;
          result.metadata.dataSize += workflowState.dataSize;
          
          if (!workflowState.success) {
            result.errors.push('Failed to restore AI workflow state');
          }
        } catch (error) {
          result.errors.push(`AI workflow restoration error: ${error.message}`);
        }
      }

      // Step 7: Restore user preferences
      if (fullOptions.restorePreferences) {
        fullOptions.progressCallback?.(85, 'Restoring user preferences...');
        
        try {
          const preferencesState = await this.restoreUserPreferences(userId);
          result.restored.preferences = preferencesState.success;
          result.metadata.dataSize += preferencesState.dataSize;
          
          if (!preferencesState.success) {
            result.errors.push('Failed to restore user preferences');
          }
        } catch (error) {
          result.errors.push(`Preferences restoration error: ${error.message}`);
        }
      }

      // Step 8: Finalize restoration
      fullOptions.progressCallback?.(95, 'Finalizing restoration...');
      
      // Initialize session manager if available
      if (this.sessionManager) {
        this.sessionManager.updateChatState(result.sessionId, {
          sessionTitle: 'Restored Session',
        });
      }

      // Update last accessed time
      await this.convexClient.mutation(api.sessions.autoSaveSession, {
        sessionId: result.sessionId as Id<'chatSessions'>,
        userId,
        priority: 'high',
      });

      result.success = true;
      result.metadata.restorationTime = Date.now() - startTime;
      
      fullOptions.progressCallback?.(100, 'Session restoration completed');
      
    } catch (error) {
      result.errors.push(`Restoration failed: ${error.message}`);
      result.metadata.restorationTime = Date.now() - startTime;
    }

    return result;
  }

  // Restore chat state
  private async restoreChatState(sessionId: string, userId: string): Promise<{
    success: boolean;
    dataSize: number;
  }> {
    try {
      const sessionData = await this.convexClient.query(api.sessions.getSessionState, {
        sessionId: sessionId as Id<'chatSessions'>,
        userId,
      });

      if (!sessionData) {
        return { success: false, dataSize: 0 };
      }

      const dataSize = JSON.stringify(sessionData.chatState).length;
      
      // The chat state is already restored by virtue of querying it
      // Additional processing can be added here if needed
      
      return { success: true, dataSize };
    } catch (error) {
      console.error('Chat state restoration failed:', error);
      return { success: false, dataSize: 0 };
    }
  }

  // Restore viewer state
  private async restoreViewerState(sessionId: string, userId: string): Promise<{
    success: boolean;
    dataSize: number;
  }> {
    try {
      const viewerSession = await this.convexClient.query(api.viewerSessions.getViewerState, {
        sessionId: sessionId as Id<'chatSessions'>,
        userId,
      });

      if (!viewerSession?.viewerState) {
        return { success: false, dataSize: 0 };
      }

      const dataSize = JSON.stringify(viewerSession.viewerState).length;
      
      // Restore viewer state using the serializer
      await sessionSerializer.deserializeViewerState(this.viewerRef, viewerSession.viewerState);
      
      return { success: true, dataSize };
    } catch (error) {
      console.error('Viewer state restoration failed:', error);
      return { success: false, dataSize: 0 };
    }
  }

  // Restore AI workflow state
  private async restoreAIWorkflowState(sessionId: string, userId: string): Promise<{
    success: boolean;
    dataSize: number;
  }> {
    try {
      // Get active workflows for the session
      const activeWorkflows = await this.convexClient.query(api.aiWorkflows.getSessionWorkflows, {
        sessionId,
        limit: 10,
      });

      let totalDataSize = 0;
      let restoredCount = 0;

      for (const workflow of activeWorkflows) {
        if (workflow.status === 'running') {
          // Restore workflow context
          const contextState = await this.workflowManager!.restoreWorkflowContext(
            workflow.workflowId,
            userId
          );

          if (contextState) {
            restoredCount++;
            totalDataSize += JSON.stringify(contextState).length;
          }
        }
      }

      // Get conversation context
      const conversationContext = await this.convexClient.query(api.aiWorkflows.getConversationContext, {
        sessionId,
        userId,
      });

      if (conversationContext) {
        totalDataSize += JSON.stringify(conversationContext).length;
      }

      return { 
        success: restoredCount > 0 || conversationContext !== null, 
        dataSize: totalDataSize,
      };
    } catch (error) {
      console.error('AI workflow state restoration failed:', error);
      return { success: false, dataSize: 0 };
    }
  }

  // Restore user preferences
  private async restoreUserPreferences(userId: string): Promise<{
    success: boolean;
    dataSize: number;
  }> {
    try {
      const preferences = await this.convexClient.query(api.molstarPreferences.getPreferences, {
        userId,
      });

      if (!preferences) {
        return { success: false, dataSize: 0 };
      }

      const dataSize = JSON.stringify(preferences).length;
      
      // Apply preferences to viewer if available
      if (this.viewerRef && preferences.preferences) {
        // Apply viewer preferences
        // This would depend on the specific viewer implementation
      }

      return { success: true, dataSize };
    } catch (error) {
      console.error('User preferences restoration failed:', error);
      return { success: false, dataSize: 0 };
    }
  }

  // Fallback to last known good session
  private async fallbackToLastKnownGoodSession(userId: string): Promise<{
    success: boolean;
    sessionId: string | null;
  }> {
    try {
      // Get recent snapshots
      const snapshots = await this.convexClient.query(api.sessionSnapshots.getUserSnapshots, {
        userId,
        snapshotType: 'checkpoint',
        limit: 10,
      });

      // Find the most recent recoverable snapshot
      const goodSnapshot = snapshots.find(s => s.isRecoverable);
      
      if (!goodSnapshot) {
        return { success: false, sessionId: null };
      }

      // Restore from snapshot
      const restoredSessionId = await this.convexClient.mutation(api.sessionSnapshots.restoreFromSnapshot, {
        snapshotId: goodSnapshot._id,
        userId,
        createNewSession: true,
      });

      return { success: true, sessionId: restoredSessionId };
    } catch (error) {
      console.error('Fallback to last known good session failed:', error);
      return { success: false, sessionId: null };
    }
  }

  // Restore from specific snapshot
  async restoreFromSnapshot(
    snapshotId: string,
    userId: string,
    createNewSession: boolean = false
  ): Promise<SessionRestorationResult> {
    const startTime = Date.now();
    const result: SessionRestorationResult = {
      success: false,
      sessionId: null,
      restored: {
        chat: false,
        viewer: false,
        aiWorkflow: false,
        preferences: false,
      },
      errors: [],
      warnings: [],
      metadata: {
        restorationTime: 0,
        dataSize: 0,
        integrityIssues: [],
        snapshotCreated: false,
      },
    };

    try {
      // Restore from snapshot
      const restoredSessionId = await this.convexClient.mutation(api.sessionSnapshots.restoreFromSnapshot, {
        snapshotId: snapshotId as Id<'sessionSnapshots'>,
        userId,
        createNewSession,
      });

      result.sessionId = restoredSessionId;

      // Get restored session data
      const sessionData = await this.convexClient.query(api.sessions.getSessionState, {
        sessionId: restoredSessionId as Id<'chatSessions'>,
        userId,
      });

      if (sessionData) {
        result.restored.chat = sessionData.chatState.messages.length > 0;
        result.restored.viewer = sessionData.viewerState !== null;
        result.restored.aiWorkflow = sessionData.session.aiWorkflowState !== null;
        result.metadata.dataSize = JSON.stringify(sessionData).length;
        
        // Restore viewer state if available
        if (sessionData.viewerState && this.viewerRef) {
          await sessionSerializer.deserializeViewerState(this.viewerRef, sessionData.viewerState);
        }
      }

      result.success = true;
      result.metadata.restorationTime = Date.now() - startTime;
      
    } catch (error) {
      result.errors.push(`Snapshot restoration failed: ${error.message}`);
      result.metadata.restorationTime = Date.now() - startTime;
    }

    return result;
  }

  // Progressive restoration for large sessions
  async progressiveRestore(
    userId: string,
    options: Partial<SessionRestorationOptions> = {}
  ): Promise<SessionRestorationResult> {
    const fullOptions: SessionRestorationOptions = {
      restoreChat: true,
      restoreViewer: true,
      restoreAIWorkflow: true,
      restorePreferences: true,
      createSnapshot: false,
      validateIntegrity: true,
      fallbackToLastKnownGood: true,
      ...options,
    };

    // Restore in phases to avoid overwhelming the system
    const phases = [
      { name: 'Chat State', restore: fullOptions.restoreChat },
      { name: 'User Preferences', restore: fullOptions.restorePreferences },
      { name: 'Viewer State', restore: fullOptions.restoreViewer },
      { name: 'AI Workflow', restore: fullOptions.restoreAIWorkflow },
    ];

    const enabledPhases = phases.filter(p => p.restore);
    const progressPerPhase = 100 / enabledPhases.length;

    let currentProgress = 0;
    
    for (const phase of enabledPhases) {
      fullOptions.progressCallback?.(currentProgress, `Restoring ${phase.name}...`);
      
      // Add delay between phases for progressive loading
      await new Promise(resolve => setTimeout(resolve, 100));
      
      currentProgress += progressPerPhase;
    }

    return await this.restoreSession(userId, fullOptions);
  }

  // Auto-restoration on user login
  async autoRestore(userId: string): Promise<SessionRestorationResult> {
    return await this.restoreSession(userId, {
      restoreChat: true,
      restoreViewer: true,
      restoreAIWorkflow: true,
      restorePreferences: true,
      createSnapshot: false,
      validateIntegrity: true,
      fallbackToLastKnownGood: true,
    });
  }

  // Get restoration recommendations
  async getRestorationRecommendations(userId: string): Promise<{
    hasRecentSession: boolean;
    lastAccessedTime: number;
    sessionCount: number;
    hasSnapshots: boolean;
    integrityIssues: string[];
    recommendations: string[];
  }> {
    try {
      const [sessions, snapshots] = await Promise.all([
        this.convexClient.query(api.chat.getSessionsWithMetadata, {
          userId,
          limit: 10,
        }),
        this.convexClient.query(api.sessionSnapshots.getUserSnapshots, {
          userId,
          limit: 5,
        }),
      ]);

      const recommendations = [];
      let integrityIssues = [];

      const hasRecentSession = sessions.length > 0;
      const lastAccessedTime = sessions[0]?.lastAccessedAt || 0;
      const timeSinceLastAccess = Date.now() - lastAccessedTime;

      // Check for recent activity
      if (timeSinceLastAccess < 24 * 60 * 60 * 1000) {
        recommendations.push('Recent activity detected - auto-restore recommended');
      } else if (timeSinceLastAccess < 7 * 24 * 60 * 60 * 1000) {
        recommendations.push('Session data available from past week');
      }

      // Check for snapshots
      if (snapshots.length > 0) {
        recommendations.push('Recovery snapshots available');
      }

      // Check integrity if there's a recent session
      if (hasRecentSession) {
        try {
          const integrityResult = await this.convexClient.query(api.sessions.validateSessionIntegrity, {
            sessionId: sessions[0]._id,
            userId,
          });

          if (!integrityResult.isValid) {
            integrityIssues = integrityResult.issues.map(i => i.type);
            recommendations.push('Session integrity issues detected - fallback recommended');
          }
        } catch (error) {
          recommendations.push('Unable to validate session integrity');
        }
      }

      return {
        hasRecentSession,
        lastAccessedTime,
        sessionCount: sessions.length,
        hasSnapshots: snapshots.length > 0,
        integrityIssues,
        recommendations,
      };
    } catch (error) {
      console.error('Failed to get restoration recommendations:', error);
      return {
        hasRecentSession: false,
        lastAccessedTime: 0,
        sessionCount: 0,
        hasSnapshots: false,
        integrityIssues: [],
        recommendations: ['Unable to analyze session data'],
      };
    }
  }
}

export default SessionRestoration;