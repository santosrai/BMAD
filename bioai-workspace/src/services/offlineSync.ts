import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { ConvexReactClient } from 'convex/react';

export interface OfflineSyncManager {
  isOnline: boolean;
  queueSize: number;
  syncInProgress: boolean;
  lastSyncTime: number | null;
  failedOperations: number;
  autoSyncEnabled: boolean;
}

export interface OfflineOperation {
  id: string;
  type: 'chat_message' | 'viewer_state' | 'ai_workflow_update' | 'session_metadata';
  target: string;
  data: any;
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export class OfflineSynchronization {
  private convexClient: ConvexReactClient;
  private userId: string;
  private syncInterval: NodeJS.Timeout | null = null;
  private operationQueue: OfflineOperation[] = [];
  private isProcessing = false;
  private listeners: ((state: OfflineSyncManager) => void)[] = [];
  private state: OfflineSyncManager = {
    isOnline: navigator.onLine,
    queueSize: 0,
    syncInProgress: false,
    lastSyncTime: null,
    failedOperations: 0,
    autoSyncEnabled: true,
  };

  constructor(convexClient: ConvexReactClient, userId: string) {
    this.convexClient = convexClient;
    this.userId = userId;
    this.setupEventListeners();
    this.startAutoSync();
  }

  private setupEventListeners(): void {
    // Network status monitoring
    window.addEventListener('online', () => {
      this.state.isOnline = true;
      this.notifyListeners();
      if (this.state.autoSyncEnabled) {
        this.processPendingOperations();
      }
    });

    window.addEventListener('offline', () => {
      this.state.isOnline = false;
      this.notifyListeners();
    });

    // Page visibility for sync optimization
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.state.isOnline && this.state.autoSyncEnabled) {
        this.processPendingOperations();
      }
    });
  }

  private startAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.state.isOnline && this.state.autoSyncEnabled && !this.isProcessing) {
        this.processPendingOperations();
      }
    }, 30000); // Sync every 30 seconds
  }

  // Queue operation for offline sync
  queueOperation(
    type: OfflineOperation['type'],
    target: string,
    data: any,
    priority: OfflineOperation['priority'] = 'medium',
    sessionId?: string
  ): string {
    const operation: OfflineOperation = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      target,
      data,
      timestamp: Date.now(),
      priority,
      retryCount: 0,
      maxRetries: this.getMaxRetries(priority),
      status: 'pending',
    };

    // Add to local queue
    this.operationQueue.push(operation);
    this.updateQueueSize();

    // If online, try to sync immediately for high priority operations
    if (this.state.isOnline && (priority === 'high' || priority === 'critical')) {
      this.processPendingOperations();
    }

    // Also queue in database for persistence
    if (this.state.isOnline) {
      this.convexClient.mutation(api.offlineSync.addToSyncQueue, {
        userId: this.userId,
        sessionId: sessionId as Id<'chatSessions'>,
        operation: {
          type,
          target,
          data,
          timestamp: operation.timestamp,
        },
        priority,
      }).catch(console.error);
    }

    return operation.id;
  }

  // Process pending operations
  async processPendingOperations(): Promise<void> {
    if (!this.state.isOnline || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.state.syncInProgress = true;
    this.notifyListeners();

    try {
      // Process local queue first
      await this.processLocalQueue();

      // Process database queue
      await this.processDatabaseQueue();

      this.state.lastSyncTime = Date.now();
    } catch (error) {
      console.error('Sync processing failed:', error);
    } finally {
      this.isProcessing = false;
      this.state.syncInProgress = false;
      this.notifyListeners();
    }
  }

  private async processLocalQueue(): Promise<void> {
    // Sort by priority and timestamp
    const sortedOperations = [...this.operationQueue].sort((a, b) => {
      const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      const aDiff = priorityWeight[a.priority] - priorityWeight[b.priority];
      if (aDiff !== 0) return aDiff;
      return a.timestamp - b.timestamp;
    });

    for (const operation of sortedOperations) {
      if (operation.status === 'pending') {
        try {
          await this.executeOperation(operation);
          operation.status = 'completed';
          this.removeFromQueue(operation.id);
        } catch (error) {
          operation.retryCount++;
          if (operation.retryCount >= operation.maxRetries) {
            operation.status = 'failed';
            this.state.failedOperations++;
            this.removeFromQueue(operation.id);
          }
          console.error(`Operation ${operation.id} failed:`, error);
        }
      }
    }
  }

  private async processDatabaseQueue(): Promise<void> {
    try {
      const results = await this.convexClient.mutation(api.offlineSync.processPendingSync, {
        userId: this.userId,
        batchSize: 20,
      });

      const failedCount = results.filter(r => !r.success).length;
      if (failedCount > 0) {
        this.state.failedOperations += failedCount;
      }
    } catch (error) {
      console.error('Database queue processing failed:', error);
    }
  }

  private async executeOperation(operation: OfflineOperation): Promise<void> {
    const { type, target, data } = operation;

    switch (type) {
      case 'chat_message':
        await this.processChatMessage(data);
        break;
      
      case 'viewer_state':
        await this.processViewerState(data);
        break;
      
      case 'ai_workflow_update':
        await this.processAIWorkflowUpdate(data);
        break;
      
      case 'session_metadata':
        await this.processSessionMetadata(data);
        break;
      
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  private async processChatMessage(data: any): Promise<void> {
    await this.convexClient.mutation(api.chat.addMessage, {
      sessionId: data.sessionId,
      userId: data.userId,
      content: data.content,
      type: data.type,
      status: 'sent',
      metadata: data.metadata,
    });
  }

  private async processViewerState(data: any): Promise<void> {
    await this.convexClient.mutation(api.viewerSessions.updateViewerState, {
      sessionId: data.sessionId,
      userId: data.userId,
      viewerState: data.viewerState,
    });
  }

  private async processAIWorkflowUpdate(data: any): Promise<void> {
    await this.convexClient.mutation(api.aiWorkflows.updateWorkflowProgress, {
      workflowId: data.workflowId,
      progress: data.progress,
      currentStep: data.currentStep,
      estimatedCompletion: data.estimatedCompletion,
      metadata: data.metadata,
    });
  }

  private async processSessionMetadata(data: any): Promise<void> {
    await this.convexClient.mutation(api.chat.updateSessionState, {
      sessionId: data.sessionId,
      userId: data.userId,
      updates: data.updates,
    });
  }

  private removeFromQueue(operationId: string): void {
    this.operationQueue = this.operationQueue.filter(op => op.id !== operationId);
    this.updateQueueSize();
  }

  private updateQueueSize(): void {
    this.state.queueSize = this.operationQueue.length;
    this.notifyListeners();
  }

  private getMaxRetries(priority: OfflineOperation['priority']): number {
    switch (priority) {
      case 'critical':
        return 5;
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
        return 1;
      default:
        return 1;
    }
  }

  // Get current sync status
  getStatus(): OfflineSyncManager {
    return { ...this.state };
  }

  // Enable/disable auto-sync
  setAutoSyncEnabled(enabled: boolean): void {
    this.state.autoSyncEnabled = enabled;
    if (enabled && this.state.isOnline) {
      this.processPendingOperations();
    }
    this.notifyListeners();
  }

  // Force sync now
  async forcSync(): Promise<void> {
    if (this.state.isOnline) {
      await this.processPendingOperations();
    }
  }

  // Get sync queue status
  async getSyncQueueStatus(): Promise<any> {
    return await this.convexClient.query(api.offlineSync.getSyncQueueStatus, {
      userId: this.userId,
    });
  }

  // Retry failed operations
  async retryFailedOperations(): Promise<void> {
    if (this.state.isOnline) {
      await this.convexClient.mutation(api.offlineSync.retryFailedOperations, {
        userId: this.userId,
      });
      
      // Reset local failed operations count
      this.state.failedOperations = 0;
      this.notifyListeners();
    }
  }

  // Clear completed operations
  async clearCompletedOperations(): Promise<void> {
    await this.convexClient.mutation(api.offlineSync.cleanupSyncQueue, {
      userId: this.userId,
      olderThanHours: 24,
    });
  }

  // Get pending operations for a specific session
  async getSessionPendingOperations(sessionId: string): Promise<any[]> {
    return await this.convexClient.query(api.offlineSync.getSessionPendingOperations, {
      sessionId: sessionId as Id<'chatSessions'>,
      userId: this.userId,
    });
  }

  // Subscribe to sync state changes
  subscribe(listener: (state: OfflineSyncManager) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Priority operations for critical data
  queueCriticalOperation(type: OfflineOperation['type'], target: string, data: any, sessionId?: string): string {
    return this.queueOperation(type, target, data, 'critical', sessionId);
  }

  // Batch operations for efficiency
  queueBatchOperations(operations: Array<{
    type: OfflineOperation['type'];
    target: string;
    data: any;
    priority?: OfflineOperation['priority'];
    sessionId?: string;
  }>): string[] {
    const ids = operations.map(op => 
      this.queueOperation(op.type, op.target, op.data, op.priority, op.sessionId)
    );

    // Process high priority operations immediately if online
    if (this.state.isOnline && operations.some(op => op.priority === 'high' || op.priority === 'critical')) {
      this.processPendingOperations();
    }

    return ids;
  }

  // Get operation by ID
  getOperation(operationId: string): OfflineOperation | null {
    return this.operationQueue.find(op => op.id === operationId) || null;
  }

  // Cancel pending operation
  cancelOperation(operationId: string): boolean {
    const operation = this.operationQueue.find(op => op.id === operationId);
    if (operation && operation.status === 'pending') {
      this.removeFromQueue(operationId);
      return true;
    }
    return false;
  }

  // Get sync statistics
  getSyncStatistics(): {
    totalOperations: number;
    pendingOperations: number;
    completedOperations: number;
    failedOperations: number;
    averageRetryCount: number;
    oldestPendingOperation: number | null;
  } {
    const pending = this.operationQueue.filter(op => op.status === 'pending');
    const completed = this.operationQueue.filter(op => op.status === 'completed');
    const failed = this.operationQueue.filter(op => op.status === 'failed');

    const avgRetryCount = this.operationQueue.reduce((sum, op) => sum + op.retryCount, 0) / this.operationQueue.length || 0;
    const oldestPending = pending.length > 0 ? Math.min(...pending.map(op => op.timestamp)) : null;

    return {
      totalOperations: this.operationQueue.length,
      pendingOperations: pending.length,
      completedOperations: completed.length,
      failedOperations: failed.length,
      averageRetryCount: avgRetryCount,
      oldestPendingOperation: oldestPending,
    };
  }

  // Cleanup and destroy
  cleanup(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    window.removeEventListener('online', () => {});
    window.removeEventListener('offline', () => {});
    document.removeEventListener('visibilitychange', () => {});

    this.operationQueue = [];
    this.listeners = [];
  }
}

export default OfflineSynchronization;