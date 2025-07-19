import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { SessionManager, type SessionState, type AutoSaveConfig } from '../services/sessionManager';
import { sessionSerializer, type SerializableViewerState } from '../utils/sessionSerializer';

export interface SessionPersistenceState {
  isAutoSaving: boolean;
  lastSaved: number | null;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  pendingChanges: number;
  isOnline: boolean;
  offlineQueueSize: number;
  sessionRestored: boolean;
  integrityIssues: string[];
}

export interface SessionPersistenceActions {
  enableAutoSave: () => void;
  disableAutoSave: () => void;
  forceSave: () => Promise<void>;
  createSnapshot: (type: 'manual' | 'checkpoint', description?: string) => Promise<void>;
  restoreFromSnapshot: (snapshotId: string) => Promise<void>;
  updateViewerState: (viewerState: Partial<SerializableViewerState>) => void;
  updateChatState: (chatState: Partial<SessionState['chatState']>) => void;
  updateAIWorkflowState: (aiState: Partial<SessionState['aiWorkflowState']>) => void;
  recordInteraction: (interaction: any) => void;
  validateSessionIntegrity: () => Promise<void>;
  repairSession: (repairOptions: any) => Promise<void>;
  exportSession: (format: 'json' | 'backup') => Promise<string>;
  importSession: (data: string, format: 'json' | 'backup') => Promise<void>;
  clearSession: () => Promise<void>;
}

export interface SessionPersistenceHookReturn {
  state: SessionPersistenceState;
  actions: SessionPersistenceActions;
  config: AutoSaveConfig;
  updateConfig: (config: Partial<AutoSaveConfig>) => void;
}

export const useSessionPersistence = (
  userId: string,
  sessionId: string | null,
  convexClient: any,
  options?: {
    autoSaveConfig?: Partial<AutoSaveConfig>;
    enableIntegrityChecks?: boolean;
    enableOfflineSupport?: boolean;
  }
): SessionPersistenceHookReturn => {
  const [state, setState] = useState<SessionPersistenceState>({
    isAutoSaving: false,
    lastSaved: null,
    saveStatus: 'idle',
    pendingChanges: 0,
    isOnline: navigator.onLine,
    offlineQueueSize: 0,
    sessionRestored: false,
    integrityIssues: [],
  });

  const sessionManagerRef = useRef<SessionManager | null>(null);
  const viewerRef = useRef<any>(null);

  // Convex mutations
  const createSnapshotMutation = useMutation(api.sessionSnapshots.create);
  const restoreSnapshotMutation = useMutation(api.sessionSnapshots.restoreFromSnapshot);
  const validateIntegrityQuery = useQuery(
    api.sessions.validateSessionIntegrity,
    sessionId && userId ? { sessionId: sessionId as Id<'chatSessions'>, userId } : 'skip'
  );
  const repairSessionMutation = useMutation(api.sessions.repairSessionIntegrity);
  const initializeRestoreMutation = useMutation(api.sessions.initializeSessionRestore);

  // Initialize session manager
  useEffect(() => {
    if (userId && convexClient) {
      const manager = new SessionManager({
        convexClient,
        userId,
        autoSaveConfig: options?.autoSaveConfig,
      });

      // Set up save indicator callback
      manager.setSaveIndicatorCallback((status) => {
        setState(prev => ({ ...prev, saveStatus: status }));
      });

      sessionManagerRef.current = manager;

      // Initialize session restoration
      if (sessionId) {
        initializeRestoreMutation({ userId })
          .then((result) => {
            if (result.restored) {
              setState(prev => ({ ...prev, sessionRestored: true }));
            }
          })
          .catch(console.error);
      }

      return () => {
        manager.cleanup();
      };
    }
  }, [userId, convexClient, sessionId, options?.autoSaveConfig]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor session manager state
  useEffect(() => {
    if (sessionManagerRef.current) {
      const interval = setInterval(() => {
        const manager = sessionManagerRef.current!;
        setState(prev => ({
          ...prev,
          pendingChanges: manager.getPendingUpdatesCount(),
          offlineQueueSize: manager.getOfflineQueueSize(),
          isAutoSaving: manager.isAutoSaveEnabled(),
        }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, []);

  // Monitor integrity issues
  useEffect(() => {
    if (validateIntegrityQuery && !validateIntegrityQuery.isValid) {
      setState(prev => ({
        ...prev,
        integrityIssues: validateIntegrityQuery.issues.map((issue: any) => issue.type),
      }));
    }
  }, [validateIntegrityQuery]);

  // Actions
  const enableAutoSave = useCallback(() => {
    if (sessionManagerRef.current) {
      sessionManagerRef.current.updateConfig({ enabled: true });
      setState(prev => ({ ...prev, isAutoSaving: true }));
    }
  }, []);

  const disableAutoSave = useCallback(() => {
    if (sessionManagerRef.current) {
      sessionManagerRef.current.updateConfig({ enabled: false });
      setState(prev => ({ ...prev, isAutoSaving: false }));
    }
  }, []);

  const forceSave = useCallback(async () => {
    if (sessionManagerRef.current) {
      setState(prev => ({ ...prev, saveStatus: 'saving' }));
      try {
        await sessionManagerRef.current.forceSave();
        setState(prev => ({ ...prev, saveStatus: 'saved', lastSaved: Date.now() }));
      } catch (error) {
        setState(prev => ({ ...prev, saveStatus: 'error' }));
        throw error;
      }
    }
  }, []);

  const createSnapshot = useCallback(async (type: 'manual' | 'checkpoint', description?: string) => {
    if (sessionManagerRef.current && sessionId) {
      setState(prev => ({ ...prev, saveStatus: 'saving' }));
      try {
        await sessionManagerRef.current.createSnapshot(sessionId, type, description);
        setState(prev => ({ ...prev, saveStatus: 'saved', lastSaved: Date.now() }));
      } catch (error) {
        setState(prev => ({ ...prev, saveStatus: 'error' }));
        throw error;
      }
    }
  }, [sessionId]);

  const restoreFromSnapshot = useCallback(async (snapshotId: string) => {
    if (sessionManagerRef.current && viewerRef.current) {
      setState(prev => ({ ...prev, saveStatus: 'saving' }));
      try {
        const sessionState = await sessionManagerRef.current.restoreFromSnapshot(snapshotId);
        
        // Restore viewer state if available
        if (sessionState.viewerState) {
          await sessionSerializer.deserializeViewerState(viewerRef.current, sessionState.viewerState);
        }

        setState(prev => ({ 
          ...prev, 
          saveStatus: 'saved', 
          lastSaved: Date.now(),
          sessionRestored: true,
        }));
      } catch (error) {
        setState(prev => ({ ...prev, saveStatus: 'error' }));
        throw error;
      }
    }
  }, []);

  const updateViewerState = useCallback((viewerState: Partial<SerializableViewerState>) => {
    if (sessionManagerRef.current && sessionId) {
      sessionManagerRef.current.updateViewerState(sessionId, viewerState);
    }
  }, [sessionId]);

  const updateChatState = useCallback((chatState: Partial<SessionState['chatState']>) => {
    if (sessionManagerRef.current && sessionId) {
      sessionManagerRef.current.updateChatState(sessionId, chatState);
    }
  }, [sessionId]);

  const updateAIWorkflowState = useCallback((aiState: Partial<SessionState['aiWorkflowState']>) => {
    if (sessionManagerRef.current && sessionId) {
      sessionManagerRef.current.updateAIWorkflowState(sessionId, aiState);
    }
  }, [sessionId]);

  const recordInteraction = useCallback((interaction: any) => {
    if (sessionManagerRef.current && sessionId) {
      sessionManagerRef.current.updateUserInteractions(sessionId, interaction);
    }
  }, [sessionId]);

  const validateSessionIntegrity = useCallback(async () => {
    if (sessionId && userId) {
      // This is handled by the validateIntegrityQuery
      // Results are automatically updated in the state
    }
  }, [sessionId, userId]);

  const repairSession = useCallback(async (repairOptions: any) => {
    if (sessionId && userId) {
      setState(prev => ({ ...prev, saveStatus: 'saving' }));
      try {
        await repairSessionMutation({
          sessionId: sessionId as Id<'chatSessions'>,
          userId,
          repairOptions,
        });
        setState(prev => ({ 
          ...prev, 
          saveStatus: 'saved', 
          lastSaved: Date.now(),
          integrityIssues: [],
        }));
      } catch (error) {
        setState(prev => ({ ...prev, saveStatus: 'error' }));
        throw error;
      }
    }
  }, [sessionId, userId]);

  const exportSession = useCallback(async (format: 'json' | 'backup'): Promise<string> => {
    if (sessionManagerRef.current && sessionId) {
      const sessionState = await sessionManagerRef.current.getFullSessionState(sessionId);
      
      if (format === 'json') {
        return JSON.stringify(sessionState, null, 2);
      } else if (format === 'backup') {
        return JSON.stringify({
          version: '1.0',
          timestamp: Date.now(),
          sessionId,
          userId,
          data: sessionState,
          checksum: sessionManagerRef.current.calculateChecksum(sessionState),
        }, null, 2);
      }
    }
    return '';
  }, [sessionId, userId]);

  const importSession = useCallback(async (data: string, format: 'json' | 'backup') => {
    if (sessionManagerRef.current && viewerRef.current) {
      setState(prev => ({ ...prev, saveStatus: 'saving' }));
      try {
        const parsedData = JSON.parse(data);
        let sessionState: SessionState;

        if (format === 'json') {
          sessionState = parsedData;
        } else if (format === 'backup') {
          // Verify checksum
          const expectedChecksum = sessionManagerRef.current.calculateChecksum(parsedData.data);
          if (expectedChecksum !== parsedData.checksum) {
            throw new Error('Invalid backup file: checksum mismatch');
          }
          sessionState = parsedData.data;
        } else {
          throw new Error('Unsupported format');
        }

        // Apply session state
        await sessionManagerRef.current.deserializeSessionState(sessionState, viewerRef.current);

        setState(prev => ({ 
          ...prev, 
          saveStatus: 'saved', 
          lastSaved: Date.now(),
          sessionRestored: true,
        }));
      } catch (error) {
        setState(prev => ({ ...prev, saveStatus: 'error' }));
        throw error;
      }
    }
  }, []);

  const clearSession = useCallback(async () => {
    if (sessionManagerRef.current && sessionId && viewerRef.current) {
      setState(prev => ({ ...prev, saveStatus: 'saving' }));
      try {
        // Clear viewer state
        await sessionSerializer.deserializeViewerState(viewerRef.current, sessionSerializer.getDefaultViewerState());
        
        // Clear session data
        await sessionManagerRef.current.clearSessionData(sessionId);

        setState(prev => ({ 
          ...prev, 
          saveStatus: 'saved', 
          lastSaved: Date.now(),
          pendingChanges: 0,
        }));
      } catch (error) {
        setState(prev => ({ ...prev, saveStatus: 'error' }));
        throw error;
      }
    }
  }, [sessionId]);

  const updateConfig = useCallback((config: Partial<AutoSaveConfig>) => {
    if (sessionManagerRef.current) {
      sessionManagerRef.current.updateConfig(config);
    }
  }, []);

  // Public API for viewer integration
  const setViewerRef = useCallback((viewer: any) => {
    viewerRef.current = viewer;
  }, []);

  const getConfig = useCallback((): AutoSaveConfig => {
    return sessionManagerRef.current?.getConfig() || {
      enabled: true,
      interval: 5000,
      debounceTime: 1000,
      maxRetries: 3,
      criticalDataPriority: true,
    };
  }, []);

  return {
    state,
    actions: {
      enableAutoSave,
      disableAutoSave,
      forceSave,
      createSnapshot,
      restoreFromSnapshot,
      updateViewerState,
      updateChatState,
      updateAIWorkflowState,
      recordInteraction,
      validateSessionIntegrity,
      repairSession,
      exportSession,
      importSession,
      clearSession,
    },
    config: getConfig(),
    updateConfig,
    // Additional utilities
    setViewerRef,
  };
};

// Hook for session snapshots management
export const useSessionSnapshots = (userId: string, sessionId: string | null) => {
  const snapshots = useQuery(
    api.sessionSnapshots.getSessionSnapshots,
    sessionId && userId ? { sessionId: sessionId as Id<'chatSessions'>, userId } : 'skip'
  );

  const snapshotStats = useQuery(
    api.sessionSnapshots.getSnapshotStats,
    userId ? { userId, sessionId: sessionId as Id<'chatSessions'> } : 'skip'
  );

  const createCheckpointMutation = useMutation(api.sessionSnapshots.createCheckpoint);
  const deleteSnapshotMutation = useMutation(api.sessionSnapshots.deleteSnapshot);
  const cleanupExpiredMutation = useMutation(api.sessionSnapshots.cleanupExpiredSnapshots);

  const createCheckpoint = useCallback(async (description: string, tags?: string[]) => {
    if (sessionId && userId) {
      return await createCheckpointMutation({
        sessionId: sessionId as Id<'chatSessions'>,
        userId,
        description,
        tags,
      });
    }
  }, [sessionId, userId]);

  const deleteSnapshot = useCallback(async (snapshotId: string) => {
    if (userId) {
      return await deleteSnapshotMutation({
        snapshotId: snapshotId as Id<'sessionSnapshots'>,
        userId,
      });
    }
  }, [userId]);

  const cleanupExpired = useCallback(async () => {
    if (userId) {
      return await cleanupExpiredMutation({ userId });
    }
  }, [userId]);

  return {
    snapshots: snapshots || [],
    stats: snapshotStats,
    actions: {
      createCheckpoint,
      deleteSnapshot,
      cleanupExpired,
    },
  };
};

// Hook for session analytics
export const useSessionAnalytics = (userId: string, timeRange?: 'day' | 'week' | 'month' | 'all') => {
  const analytics = useQuery(
    api.sessions.getSessionAnalytics,
    userId ? { userId, timeRange } : 'skip'
  );

  return {
    analytics,
    isLoading: analytics === undefined,
  };
};