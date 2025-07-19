import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { ConvexReactClient } from 'convex/react';

export interface SessionCleanupOptions {
  olderThanDays: number;
  removeEmptySessions: boolean;
  cleanupSnapshots: boolean;
  cleanupOfflineQueue: boolean;
  cleanupWorkflows: boolean;
  dryRun: boolean;
  preserveActive: boolean;
  preserveRecent: boolean;
  maxSessionsToKeep?: number;
}

export interface SessionCleanupResult {
  sessionsDeleted: number;
  snapshotsDeleted: number;
  offlineOperationsDeleted: number;
  workflowsDeleted: number;
  bytesFreed: number;
  errors: string[];
  warnings: string[];
  summary: string;
}

export class SessionCleanup {
  private convexClient: ConvexReactClient;

  constructor(convexClient: ConvexReactClient) {
    this.convexClient = convexClient;
  }

  async cleanupUserSessions(
    userId: string,
    options: Partial<SessionCleanupOptions> = {}
  ): Promise<SessionCleanupResult> {
    const fullOptions: SessionCleanupOptions = {
      olderThanDays: 30,
      removeEmptySessions: true,
      cleanupSnapshots: true,
      cleanupOfflineQueue: true,
      cleanupWorkflows: true,
      dryRun: false,
      preserveActive: true,
      preserveRecent: true,
      maxSessionsToKeep: 50,
      ...options,
    };

    const result: SessionCleanupResult = {
      sessionsDeleted: 0,
      snapshotsDeleted: 0,
      offlineOperationsDeleted: 0,
      workflowsDeleted: 0,
      bytesFreed: 0,
      errors: [],
      warnings: [],
      summary: '',
    };

    try {
      // Get all sessions for the user
      const sessions = await this.convexClient.query(api.chat.getSessionsWithMetadata, {
        userId,
        includeInactive: true,
      });

      if (!sessions || sessions.length === 0) {
        result.summary = 'No sessions found for cleanup';
        return result;
      }

      // Cleanup snapshots first
      if (fullOptions.cleanupSnapshots) {
        try {
          const snapshotsDeleted = await this.convexClient.mutation(api.sessionSnapshots.cleanupExpiredSnapshots, {
            userId,
          });
          result.snapshotsDeleted = snapshotsDeleted;
        } catch (error) {
          result.errors.push(`Snapshot cleanup failed: ${error.message}`);
        }
      }

      // Cleanup offline queue
      if (fullOptions.cleanupOfflineQueue) {
        try {
          const offlineDeleted = await this.convexClient.mutation(api.offlineSync.cleanupSyncQueue, {
            userId,
            olderThanHours: fullOptions.olderThanDays * 24,
          });
          result.offlineOperationsDeleted = offlineDeleted;
        } catch (error) {
          result.errors.push(`Offline queue cleanup failed: ${error.message}`);
        }
      }

      // Cleanup workflows
      if (fullOptions.cleanupWorkflows) {
        try {
          const workflowsDeleted = await this.convexClient.mutation(api.aiWorkflows.cleanupOldWorkflows, {
            userId,
            olderThanDays: fullOptions.olderThanDays,
          });
          result.workflowsDeleted = workflowsDeleted;
        } catch (error) {
          result.errors.push(`Workflow cleanup failed: ${error.message}`);
        }
      }

      // Determine which sessions to delete
      const cutoffTime = Date.now() - (fullOptions.olderThanDays * 24 * 60 * 60 * 1000);
      const sessionsToDelete = sessions.filter(session => {
        // Preserve active sessions if requested
        if (fullOptions.preserveActive && session.isActive) {
          return false;
        }

        // Preserve recent sessions if requested
        if (fullOptions.preserveRecent && session.lastAccessedAt > cutoffTime) {
          return false;
        }

        // Remove empty sessions if requested
        if (fullOptions.removeEmptySessions && session.messageCount === 0) {
          return true;
        }

        // Remove old sessions
        return session.lastAccessedAt < cutoffTime;
      });

      // Sort sessions by last accessed time (oldest first)
      sessionsToDelete.sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);

      // Apply max sessions to keep limit
      if (fullOptions.maxSessionsToKeep) {
        const totalSessions = sessions.length;
        const maxToDelete = Math.max(0, totalSessions - fullOptions.maxSessionsToKeep);
        if (sessionsToDelete.length > maxToDelete) {
          sessionsToDelete.splice(maxToDelete);
        }
      }

      // Delete sessions
      if (!fullOptions.dryRun) {
        for (const session of sessionsToDelete) {
          try {
            await this.convexClient.mutation(api.chat.deleteSession, {
              sessionId: session._id,
              userId,
            });
            result.sessionsDeleted++;
            result.bytesFreed += this.estimateSessionSize(session);
          } catch (error) {
            result.errors.push(`Failed to delete session ${session._id}: ${error.message}`);
          }
        }
      } else {
        result.sessionsDeleted = sessionsToDelete.length;
        result.bytesFreed = sessionsToDelete.reduce((sum, session) => sum + this.estimateSessionSize(session), 0);
      }

      // Generate summary
      result.summary = this.generateCleanupSummary(result, fullOptions);

      return result;
    } catch (error) {
      result.errors.push(`Cleanup failed: ${error.message}`);
      return result;
    }
  }

  async getCleanupRecommendations(userId: string): Promise<{
    recommendations: string[];
    stats: {
      totalSessions: number;
      emptySessions: number;
      oldSessions: number;
      totalSnapshots: number;
      expiredSnapshots: number;
      offlineOperations: number;
      oldWorkflows: number;
      estimatedBytesFreed: number;
    };
  }> {
    const recommendations: string[] = [];
    const stats = {
      totalSessions: 0,
      emptySessions: 0,
      oldSessions: 0,
      totalSnapshots: 0,
      expiredSnapshots: 0,
      offlineOperations: 0,
      oldWorkflows: 0,
      estimatedBytesFreed: 0,
    };

    try {
      // Get sessions data
      const sessions = await this.convexClient.query(api.chat.getSessionsWithMetadata, {
        userId,
        includeInactive: true,
      });

      if (sessions) {
        stats.totalSessions = sessions.length;
        
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        stats.emptySessions = sessions.filter(s => s.messageCount === 0).length;
        stats.oldSessions = sessions.filter(s => s.lastAccessedAt < thirtyDaysAgo).length;

        if (stats.emptySessions > 0) {
          recommendations.push(`Remove ${stats.emptySessions} empty sessions`);
        }

        if (stats.oldSessions > 0) {
          recommendations.push(`Consider removing ${stats.oldSessions} sessions older than 30 days`);
        }

        if (stats.totalSessions > 100) {
          recommendations.push('Consider setting a maximum number of sessions to keep');
        }
      }

      // Get snapshots data
      const snapshots = await this.convexClient.query(api.sessionSnapshots.getUserSnapshots, {
        userId,
      });

      if (snapshots) {
        stats.totalSnapshots = snapshots.length;
        const now = Date.now();
        stats.expiredSnapshots = snapshots.filter(s => s.expiresAt && s.expiresAt < now).length;

        if (stats.expiredSnapshots > 0) {
          recommendations.push(`Clean up ${stats.expiredSnapshots} expired snapshots`);
        }

        if (stats.totalSnapshots > 50) {
          recommendations.push('Consider cleaning up old snapshots to save space');
        }
      }

      // Get offline operations
      const offlineStatus = await this.convexClient.query(api.offlineSync.getSyncQueueStatus, {
        userId,
      });

      if (offlineStatus) {
        stats.offlineOperations = offlineStatus.completed + offlineStatus.failed;
        
        if (stats.offlineOperations > 100) {
          recommendations.push('Clean up processed offline operations');
        }
      }

      // Get workflows
      const workflows = await this.convexClient.query(api.aiWorkflows.getUserWorkflows, {
        userId,
      });

      if (workflows) {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        stats.oldWorkflows = workflows.filter(w => w.startTime < thirtyDaysAgo && w.status !== 'running').length;

        if (stats.oldWorkflows > 0) {
          recommendations.push(`Clean up ${stats.oldWorkflows} old workflows`);
        }
      }

      // Estimate bytes that could be freed
      if (sessions) {
        stats.estimatedBytesFreed = sessions
          .filter(s => s.messageCount === 0 || s.lastAccessedAt < thirtyDaysAgo)
          .reduce((sum, session) => sum + this.estimateSessionSize(session), 0);
      }

      if (recommendations.length === 0) {
        recommendations.push('No cleanup recommendations at this time');
      }

      return { recommendations, stats };
    } catch (error) {
      console.error('Failed to get cleanup recommendations:', error);
      return {
        recommendations: ['Unable to analyze cleanup recommendations'],
        stats,
      };
    }
  }

  private estimateSessionSize(session: any): number {
    // Rough estimate of session size in bytes
    const baseSize = 1024; // Base session metadata
    const messageSize = session.messageCount * 500; // ~500 bytes per message
    const metadataSize = JSON.stringify(session).length;
    
    return baseSize + messageSize + metadataSize;
  }

  private generateCleanupSummary(result: SessionCleanupResult, options: SessionCleanupOptions): string {
    const parts = [];
    
    if (options.dryRun) {
      parts.push('DRY RUN - No actual changes made');
    }

    if (result.sessionsDeleted > 0) {
      parts.push(`${result.sessionsDeleted} sessions would be deleted`);
    }

    if (result.snapshotsDeleted > 0) {
      parts.push(`${result.snapshotsDeleted} snapshots cleaned up`);
    }

    if (result.offlineOperationsDeleted > 0) {
      parts.push(`${result.offlineOperationsDeleted} offline operations cleaned up`);
    }

    if (result.workflowsDeleted > 0) {
      parts.push(`${result.workflowsDeleted} workflows cleaned up`);
    }

    if (result.bytesFreed > 0) {
      const mb = (result.bytesFreed / (1024 * 1024)).toFixed(2);
      parts.push(`~${mb} MB of data freed`);
    }

    if (result.errors.length > 0) {
      parts.push(`${result.errors.length} errors occurred`);
    }

    if (parts.length === 0) {
      return 'No cleanup actions performed';
    }

    return parts.join(', ');
  }
}

export default SessionCleanup;