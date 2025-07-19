import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Add operation to offline sync queue
export const addToSyncQueue = mutation({
  args: {
    userId: v.string(),
    sessionId: v.optional(v.id("chatSessions")),
    operation: v.object({
      type: v.string(),
      target: v.string(),
      data: v.any(),
      timestamp: v.number(),
    }),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("offlineSyncQueue", {
      userId: args.userId,
      sessionId: args.sessionId,
      operation: args.operation,
      status: "pending",
      retryCount: 0,
      priority: args.priority,
      createdAt: Date.now(),
    });
  },
});

// Process pending sync operations
export const processPendingSync = mutation({
  args: {
    userId: v.string(),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 10;
    
    // Get pending operations ordered by priority and creation time
    const operations = await ctx.db
      .query("offlineSyncQueue")
      .withIndex("by_user_status", (q) => q.eq("userId", args.userId).eq("status", "pending"))
      .order("asc")
      .take(batchSize);

    const results = [];

    for (const op of operations) {
      try {
        // Mark as processing
        await ctx.db.patch(op._id, {
          status: "processing",
          lastAttempt: Date.now(),
        });

        // Process operation based on type
        const result = await processOperation(ctx, {
          operation: op.operation,
          sessionId: op.sessionId,
          userId: op.userId,
        });
        
        // Mark as completed
        await ctx.db.patch(op._id, {
          status: "completed",
        });

        results.push({
          operationId: op._id,
          success: true,
          result,
        });
      } catch (error) {
        // Handle failure
        const retryCount = op.retryCount + 1;
        const maxRetries = getMaxRetries(op.priority);

        if (retryCount >= maxRetries) {
          await ctx.db.patch(op._id, {
            status: "failed",
            retryCount,
            error: error instanceof Error ? error.message : String(error),
          });
        } else {
          await ctx.db.patch(op._id, {
            status: "pending",
            retryCount,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        results.push({
          operationId: op._id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          retryCount,
        });
      }
    }

    return results;
  },
});

// Get sync queue status
export const getSyncQueueStatus = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const operations = await ctx.db
      .query("offlineSyncQueue")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const stats = {
      total: operations.length,
      pending: operations.filter(op => op.status === "pending").length,
      processing: operations.filter(op => op.status === "processing").length,
      completed: operations.filter(op => op.status === "completed").length,
      failed: operations.filter(op => op.status === "failed").length,
      byPriority: {
        critical: operations.filter(op => op.priority === "critical").length,
        high: operations.filter(op => op.priority === "high").length,
        medium: operations.filter(op => op.priority === "medium").length,
        low: operations.filter(op => op.priority === "low").length,
      },
    };

    return stats;
  },
});

// Clean up completed/failed operations
export const cleanupSyncQueue = mutation({
  args: {
    userId: v.string(),
    olderThanHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - ((args.olderThanHours || 24) * 60 * 60 * 1000);
    
    const oldOperations = await ctx.db
      .query("offlineSyncQueue")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.lt(q.field("createdAt"), cutoffTime))
      .filter((q) => q.neq(q.field("status"), "pending"))
      .collect();

    for (const op of oldOperations) {
      await ctx.db.delete(op._id);
    }

    return oldOperations.length;
  },
});

// Retry failed operations
export const retryFailedOperations = mutation({
  args: {
    userId: v.string(),
    operationIds: v.optional(v.array(v.id("offlineSyncQueue"))),
  },
  handler: async (ctx, args) => {
    let operations;

    if (args.operationIds) {
      operations = [];
      for (const id of args.operationIds) {
        const op = await ctx.db.get(id);
        if (op && op.userId === args.userId) {
          operations.push(op);
        }
      }
    } else {
      operations = await ctx.db
        .query("offlineSyncQueue")
        .withIndex("by_user_status", (q) => q.eq("userId", args.userId).eq("status", "failed"))
        .collect();
    }

    let retriedCount = 0;
    for (const op of operations) {
      await ctx.db.patch(op._id, {
        status: "pending",
        error: undefined,
        lastAttempt: undefined,
      });
      retriedCount++;
    }

    return retriedCount;
  },
});

// Get pending operations for specific session
export const getSessionPendingOperations = query({
  args: {
    sessionId: v.id("chatSessions"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("offlineSyncQueue")
      .withIndex("by_user_status", (q) => q.eq("userId", args.userId).eq("status", "pending"))
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .order("asc")
      .collect();
  },
});

// Helper function to process individual operations
async function processOperation(ctx: any, operation: { operation: { type: any; data: any; }; sessionId: any; userId: any; }) {
  const { type, data } = operation.operation;

  switch (type) {
    case "chat_message":
      return await processChatMessage(ctx, operation.sessionId, data);
    
    case "viewer_state":
      return await processViewerState(ctx, operation.sessionId, operation.userId, data);
    
    case "ai_workflow_update":
      return await processAIWorkflowUpdate(ctx, data);
    
    case "session_metadata":
      return await processSessionMetadata(ctx, operation.sessionId, data);
    
    default:
      throw new Error(`Unknown operation type: ${type}`);
  }
}

// Process chat message operation
async function processChatMessage(ctx: any, sessionId: any, data: { userId: any; content: any; timestamp: any; type: any; metadata: any; }) {
  return await ctx.db.insert("chatMessages", {
    sessionId,
    userId: data.userId,
    content: data.content,
    timestamp: data.timestamp,
    type: data.type,
    status: "sent",
    metadata: data.metadata,
  });
}

// Process viewer state operation
async function processViewerState(ctx: any, sessionId: any, userId: string, data: { viewerState: any; }) {
  const existing = await ctx.db
    .query("viewerSessions")
    .withIndex("by_user_session", (q) => q.eq("userId", userId).eq("sessionId", sessionId))
    .first();

  if (existing) {
    return await ctx.db.patch(existing._id, {
      viewerState: data.viewerState,
      lastSaved: Date.now(),
    });
  } else {
    return await ctx.db.insert("viewerSessions", {
      userId,
      sessionId,
      viewerState: data.viewerState,
      interactions: [],
      lastSaved: Date.now(),
      autoSaveEnabled: true,
    });
  }
}

// Process AI workflow update operation
async function processAIWorkflowUpdate(ctx: any, data: { workflowId: any; progress: any; currentStep: any; status: any; metadata: any; }) {
  const workflow = await ctx.db
    .query("aiWorkflows")
    .withIndex("by_workflow_id", (q) => q.eq("workflowId", data.workflowId))
    .first();

  if (workflow) {
    return await ctx.db.patch(workflow._id, {
      progress: data.progress,
      currentStep: data.currentStep,
      status: data.status,
      metadata: data.metadata,
    });
  } else {
    throw new Error(`Workflow ${data.workflowId} not found`);
  }
}

// Process session metadata operation
async function processSessionMetadata(ctx: any, sessionId: any, data: any) {
  return await ctx.db.patch(sessionId, {
    ...data,
    updatedAt: Date.now(),
  });
}

// Get max retries based on priority
function getMaxRetries(priority: string): number {
  switch (priority) {
    case "critical":
      return 5;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 1;
  }
}