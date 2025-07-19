import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { ConvexReactClient } from 'convex/react';

export interface SessionState {
  chatState: {
    messages: any[];
    messageCount: number;
    sessionTitle: string;
    inputValue?: string;
  };
  viewerState?: {
    structures: any[];
    camera?: any;
    representations: any[];
    selections: any[];
    measurements?: any[];
    annotations?: any[];
    viewingMode: string;
    visualization: any;
  };
  aiWorkflowState?: {
    currentWorkflow?: string;
    workflowHistory?: any[];
    conversationMemory?: any;
    toolStates?: any;
  };
  userInteractions?: any[];
  metadata?: {
    lastSaved: number;
    autoSaveEnabled: boolean;
    size: number;
  };
}

export interface AutoSaveConfig {
  enabled: boolean;
  interval: number; // milliseconds
  debounceTime: number; // milliseconds
  maxRetries: number;
  criticalDataPriority: boolean;
}

export interface SessionManagerOptions {
  convexClient: ConvexReactClient;
  userId: string;
  autoSaveConfig?: Partial<AutoSaveConfig>;
}

export class SessionManager {
  private convexClient: ConvexReactClient;
  private userId: string;
  private config: AutoSaveConfig;
  private pendingUpdates: Map<string, any> = new Map();
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private isOnline: boolean = navigator.onLine;
  private offlineQueue: any[] = [];
  private saveIndicatorCallback?: (status: 'saving' | 'saved' | 'error') => void;

  constructor(options: SessionManagerOptions) {
    this.convexClient = options.convexClient;
    this.userId = options.userId;
    this.config = {
      enabled: true,
      interval: 5000, // 5 seconds
      debounceTime: 1000, // 1 second
      maxRetries: 3,
      criticalDataPriority: true,
      ...options.autoSaveConfig,
    };

    this.setupEventListeners();
    this.startAutoSave();
  }

  private setupEventListeners(): void {
    // Network status monitoring
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processPendingOfflineQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Page visibility for pause/resume auto-save
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseAutoSave();
      } else {
        this.resumeAutoSave();
      }
    });

    // Beforeunload for critical save
    window.addEventListener('beforeunload', (e) => {
      if (this.pendingUpdates.size > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        this.forceSave();
      }
    });
  }

  private startAutoSave(): void {
    if (!this.config.enabled) return;

    this.autoSaveTimer = setInterval(() => {
      this.processAutoSave();
    }, this.config.interval);
  }

  private pauseAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  private resumeAutoSave(): void {
    if (!this.autoSaveTimer && this.config.enabled) {
      this.startAutoSave();
    }
  }

  public updateChatState(sessionId: string, updates: Partial<SessionState['chatState']>): void {
    this.queueUpdate('chat', sessionId, updates, 'high');
  }

  public updateViewerState(sessionId: string, updates: Partial<SessionState['viewerState']>): void {
    this.queueUpdate('viewer', sessionId, updates, 'medium');
  }

  public updateAIWorkflowState(sessionId: string, updates: Partial<SessionState['aiWorkflowState']>): void {
    this.queueUpdate('aiWorkflow', sessionId, updates, 'high');
  }

  public updateUserInteractions(sessionId: string, interaction: any): void {
    const existing = this.pendingUpdates.get(`interactions_${sessionId}`) || [];
    this.queueUpdate('interactions', sessionId, [...existing, interaction], 'low');
  }

  private queueUpdate(type: string, sessionId: string, updates: any, priority: 'low' | 'medium' | 'high'): void {
    const key = `${type}_${sessionId}`;
    this.pendingUpdates.set(key, {
      type,
      sessionId,
      updates,
      priority,
      timestamp: Date.now(),
    });

    // Debounce saves except for critical data
    if (priority === 'high' && this.config.criticalDataPriority) {
      this.debouncedSave(key, 100); // Quick save for critical data
    } else {
      this.debouncedSave(key, this.config.debounceTime);
    }
  }

  private debouncedSave(key: string, delay: number): void {
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key)!);
    }

    const timer = setTimeout(() => {
      this.processSingleUpdate(key);
      this.debounceTimers.delete(key);
    }, delay);

    this.debounceTimers.set(key, timer);
  }

  private async processSingleUpdate(key: string): Promise<void> {
    const update = this.pendingUpdates.get(key);
    if (!update) return;

    this.showSaveIndicator('saving');

    try {
      await this.saveUpdate(update);
      this.pendingUpdates.delete(key);
      this.showSaveIndicator('saved');
    } catch (error) {
      console.error('Failed to save update:', error);
      this.showSaveIndicator('error');
      
      if (!this.isOnline) {
        this.offlineQueue.push(update);
      }
    }
  }

  private async processAutoSave(): Promise<void> {
    if (this.pendingUpdates.size === 0) return;

    const updates = Array.from(this.pendingUpdates.values());
    
    // Process high priority updates first
    const highPriorityUpdates = updates.filter(u => u.priority === 'high');
    const otherUpdates = updates.filter(u => u.priority !== 'high');

    try {
      // Process critical updates immediately
      for (const update of highPriorityUpdates) {
        await this.saveUpdate(update);
        this.pendingUpdates.delete(`${update.type}_${update.sessionId}`);
      }

      // Batch process other updates
      await this.batchSaveUpdates(otherUpdates);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }

  private async saveUpdate(update: any): Promise<void> {
    const { type, sessionId, updates } = update;

    switch (type) {
      case 'chat':
        await this.saveChatState(sessionId, updates);
        break;
      case 'viewer':
        await this.saveViewerState(sessionId, updates);
        break;
      case 'aiWorkflow':
        await this.saveAIWorkflowState(sessionId, updates);
        break;
      case 'interactions':
        await this.saveUserInteractions(sessionId, updates);
        break;
      default:
        console.warn('Unknown update type:', type);
    }
  }

  private async saveChatState(sessionId: string, updates: any): Promise<void> {
    await this.convexClient.mutation(api.chat.updateSessionState, {
      sessionId: sessionId as Id<'chatSessions'>,
      userId: this.userId,
      updates,
    });
  }

  private async saveViewerState(sessionId: string, updates: any): Promise<void> {
    await this.convexClient.mutation(api.viewerSessions.updateViewerState, {
      sessionId: sessionId as Id<'chatSessions'>,
      userId: this.userId,
      viewerState: updates,
    });
  }

  private async saveAIWorkflowState(sessionId: string, updates: any): Promise<void> {
    await this.convexClient.mutation(api.chat.updateAIWorkflowState, {
      sessionId: sessionId as Id<'chatSessions'>,
      userId: this.userId,
      aiWorkflowState: updates,
    });
  }

  private async saveUserInteractions(sessionId: string, interactions: any[]): Promise<void> {
    await this.convexClient.mutation(api.viewerSessions.updateInteractions, {
      sessionId: sessionId as Id<'chatSessions'>,
      userId: this.userId,
      interactions,
    });
  }

  private async batchSaveUpdates(updates: any[]): Promise<void> {
    // Group updates by session for efficient batch processing
    const groupedUpdates = updates.reduce((acc, update) => {
      const key = update.sessionId;
      if (!acc[key]) acc[key] = [];
      acc[key].push(update);
      return acc;
    }, {} as Record<string, any[]>);

    // Process each session's updates
    for (const [sessionId, sessionUpdates] of Object.entries(groupedUpdates)) {
      try {
        await this.processBatchedSessionUpdates(sessionId, sessionUpdates);
        
        // Remove processed updates
        sessionUpdates.forEach(update => {
          this.pendingUpdates.delete(`${update.type}_${update.sessionId}`);
        });
      } catch (error) {
        console.error(`Failed to save batched updates for session ${sessionId}:`, error);
      }
    }
  }

  private async processBatchedSessionUpdates(sessionId: string, updates: any[]): Promise<void> {
    const batchData = {
      chatState: {},
      viewerState: {},
      aiWorkflowState: {},
      interactions: [],
    };

    // Consolidate updates by type
    updates.forEach(update => {
      switch (update.type) {
        case 'chat':
          Object.assign(batchData.chatState, update.updates);
          break;
        case 'viewer':
          Object.assign(batchData.viewerState, update.updates);
          break;
        case 'aiWorkflow':
          Object.assign(batchData.aiWorkflowState, update.updates);
          break;
        case 'interactions':
          batchData.interactions.push(...update.updates);
          break;
      }
    });

    // Save consolidated batch
    await this.convexClient.mutation(api.sessions.updateSessionBatch, {
      sessionId: sessionId as Id<'chatSessions'>,
      userId: this.userId,
      batchData,
    });
  }

  private async processPendingOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const update of queue) {
      try {
        await this.saveUpdate(update);
      } catch (error) {
        console.error('Failed to process offline update:', error);
        this.offlineQueue.push(update); // Re-queue failed updates
      }
    }
  }

  public async forceSave(): Promise<void> {
    if (this.pendingUpdates.size === 0) return;

    const updates = Array.from(this.pendingUpdates.values());
    
    try {
      await Promise.all(updates.map(update => this.saveUpdate(update)));
      this.pendingUpdates.clear();
    } catch (error) {
      console.error('Force save failed:', error);
      throw error;
    }
  }

  public async createSnapshot(sessionId: string, type: 'auto' | 'manual' | 'checkpoint', description?: string): Promise<void> {
    const sessionState = await this.getFullSessionState(sessionId);
    
    await this.convexClient.mutation(api.sessionSnapshots.create, {
      userId: this.userId,
      sessionId: sessionId as Id<'chatSessions'>,
      snapshotType: type,
      data: sessionState,
      metadata: {
        size: JSON.stringify(sessionState).length,
        description,
        checksum: this.calculateChecksum(sessionState),
      },
    });
  }

  public async restoreFromSnapshot(snapshotId: string): Promise<SessionState> {
    const snapshot = await this.convexClient.query(api.sessionSnapshots.get, {
      snapshotId: snapshotId as Id<'sessionSnapshots'>,
      userId: this.userId,
    });

    if (!snapshot) {
      throw new Error('Snapshot not found');
    }

    return snapshot.data;
  }

  private async getFullSessionState(sessionId: string): Promise<SessionState> {
    const [chatState, viewerState, sessionData] = await Promise.all([
      this.convexClient.query(api.chat.getSessionMessages, {
        sessionId: sessionId as Id<'chatSessions'>,
        userId: this.userId,
      }),
      this.convexClient.query(api.viewerSessions.getViewerState, {
        sessionId: sessionId as Id<'chatSessions'>,
        userId: this.userId,
      }),
      this.convexClient.query(api.chat.getSession, {
        sessionId: sessionId as Id<'chatSessions'>,
        userId: this.userId,
      }),
    ]);

    return {
      chatState: {
        messages: chatState || [],
        messageCount: chatState?.length || 0,
        sessionTitle: sessionData?.title || 'Untitled Session',
      },
      viewerState: viewerState?.viewerState,
      aiWorkflowState: sessionData?.aiWorkflowState,
      metadata: {
        lastSaved: Date.now(),
        autoSaveEnabled: this.config.enabled,
        size: 0,
      },
    };
  }

  private calculateChecksum(data: any): string {
    // Simple checksum calculation for data integrity
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  private showSaveIndicator(status: 'saving' | 'saved' | 'error'): void {
    if (this.saveIndicatorCallback) {
      this.saveIndicatorCallback(status);
    }
  }

  public setSaveIndicatorCallback(callback: (status: 'saving' | 'saved' | 'error') => void): void {
    this.saveIndicatorCallback = callback;
  }

  public getConfig(): AutoSaveConfig {
    return { ...this.config };
  }

  public updateConfig(config: Partial<AutoSaveConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.autoSaveTimer) {
      this.pauseAutoSave();
      this.startAutoSave();
    }
  }

  public getPendingUpdatesCount(): number {
    return this.pendingUpdates.size;
  }

  public getOfflineQueueSize(): number {
    return this.offlineQueue.length;
  }

  public isAutoSaveEnabled(): boolean {
    return this.config.enabled;
  }

  public cleanup(): void {
    this.pauseAutoSave();
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    this.pendingUpdates.clear();
    
    window.removeEventListener('online', this.processPendingOfflineQueue);
    window.removeEventListener('offline', () => this.isOnline = false);
    document.removeEventListener('visibilitychange', () => {});
    window.removeEventListener('beforeunload', () => {});
  }
}