import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a session snapshot
export const create = mutation({
  args: {
    userId: v.string(),
    sessionId: v.id("chatSessions"),
    snapshotType: v.union(v.literal("auto"), v.literal("manual"), v.literal("checkpoint")),
    data: v.object({
      chatState: v.object({
        messages: v.array(v.any()),
        messageCount: v.number(),
        sessionTitle: v.string(),
      }),
      viewerState: v.optional(v.any()),
      aiWorkflowState: v.optional(v.any()),
      userInteractions: v.optional(v.array(v.any())),
    }),
    metadata: v.optional(v.object({
      size: v.number(),
      checksum: v.optional(v.string()),
      description: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
    })),
  },
  handler: async (ctx, args) => {
    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found or unauthorized");
    }

    const now = Date.now();
    
    // Set expiration time based on snapshot type
    let expiresAt: number | undefined;
    switch (args.snapshotType) {
      case "auto":
        expiresAt = now + (30 * 24 * 60 * 60 * 1000); // 30 days
        break;
      case "manual":
        expiresAt = now + (90 * 24 * 60 * 60 * 1000); // 90 days
        break;
      case "checkpoint":
        // Checkpoints don't expire
        expiresAt = undefined;
        break;
    }

    const snapshotId = await ctx.db.insert("sessionSnapshots", {
      userId: args.userId,
      sessionId: args.sessionId,
      snapshotType: args.snapshotType,
      timestamp: now,
      data: args.data,
      metadata: args.metadata,
      isRecoverable: true,
      expiresAt,
    });

    // Clean up old auto snapshots (keep only 10 most recent)
    if (args.snapshotType === "auto") {
      const autoSnapshots = await ctx.db
        .query("sessionSnapshots")
        .withIndex("by_session_timestamp", (q) => q.eq("sessionId", args.sessionId))
        .filter((q) => q.eq(q.field("snapshotType"), "auto"))
        .order("desc")
        .collect();

      if (autoSnapshots.length > 10) {
        const snapshotsToDelete = autoSnapshots.slice(10);
        for (const snapshot of snapshotsToDelete) {
          await ctx.db.delete(snapshot._id);
        }
      }
    }

    return snapshotId;
  },
});

// Get a specific snapshot
export const get = query({
  args: {
    snapshotId: v.id("sessionSnapshots"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const snapshot = await ctx.db.get(args.snapshotId);
    if (!snapshot || snapshot.userId !== args.userId) {
      throw new Error("Snapshot not found or unauthorized");
    }
    return snapshot;
  },
});

// Get all snapshots for a session
export const getSessionSnapshots = query({
  args: {
    sessionId: v.id("chatSessions"),
    userId: v.string(),
    snapshotType: v.optional(v.union(v.literal("auto"), v.literal("manual"), v.literal("checkpoint"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found or unauthorized");
    }

    let query = ctx.db
      .query("sessionSnapshots")
      .withIndex("by_session_timestamp", (q) => q.eq("sessionId", args.sessionId))
      .order("desc");

    if (args.snapshotType) {
      query = query.filter((q) => q.eq(q.field("snapshotType"), args.snapshotType));
    }

    if (args.limit) {
      return await query.take(args.limit);
    }

    return await query.collect();
  },
});

// Get all snapshots for a user
export const getUserSnapshots = query({
  args: {
    userId: v.string(),
    snapshotType: v.optional(v.union(v.literal("auto"), v.literal("manual"), v.literal("checkpoint"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("sessionSnapshots")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", args.userId))
      .order("desc");

    if (args.snapshotType) {
      query = query.filter((q) => q.eq(q.field("snapshotType"), args.snapshotType));
    }

    if (args.limit) {
      return await query.take(args.limit);
    }

    return await query.collect();
  },
});

// Delete a snapshot
export const deleteSnapshot = mutation({
  args: {
    snapshotId: v.id("sessionSnapshots"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const snapshot = await ctx.db.get(args.snapshotId);
    if (!snapshot || snapshot.userId !== args.userId) {
      throw new Error("Snapshot not found or unauthorized");
    }

    await ctx.db.delete(args.snapshotId);
  },
});

// Mark snapshot as non-recoverable
export const markAsNonRecoverable = mutation({
  args: {
    snapshotId: v.id("sessionSnapshots"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const snapshot = await ctx.db.get(args.snapshotId);
    if (!snapshot || snapshot.userId !== args.userId) {
      throw new Error("Snapshot not found or unauthorized");
    }

    await ctx.db.patch(args.snapshotId, {
      isRecoverable: false,
    });
  },
});

// Clean up expired snapshots
export const cleanupExpiredSnapshots = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const expiredSnapshots = await ctx.db
      .query("sessionSnapshots")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    let deletedCount = 0;
    for (const snapshot of expiredSnapshots) {
      await ctx.db.delete(snapshot._id);
      deletedCount++;
    }

    return deletedCount;
  },
});

// Get snapshot statistics
export const getSnapshotStats = query({
  args: {
    userId: v.string(),
    sessionId: v.optional(v.id("chatSessions")),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("sessionSnapshots")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));

    if (args.sessionId) {
      query = query.filter((q) => q.eq(q.field("sessionId"), args.sessionId));
    }

    const snapshots = await query.collect();

    const stats = {
      total: snapshots.length,
      auto: snapshots.filter(s => s.snapshotType === "auto").length,
      manual: snapshots.filter(s => s.snapshotType === "manual").length,
      checkpoint: snapshots.filter(s => s.snapshotType === "checkpoint").length,
      recoverable: snapshots.filter(s => s.isRecoverable).length,
      expired: snapshots.filter(s => s.expiresAt && s.expiresAt < Date.now()).length,
      totalSize: snapshots.reduce((sum, s) => sum + (s.metadata?.size || 0), 0),
    };

    return stats;
  },
});

// Create checkpoint snapshot
export const createCheckpoint = mutation({
  args: {
    userId: v.string(),
    sessionId: v.id("chatSessions"),
    description: v.string(),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found or unauthorized");
    }

    // Get current session data
    const [messages, viewerState] = await Promise.all([
      ctx.db
        .query("chatMessages")
        .withIndex("by_session_timestamp", (q) => q.eq("sessionId", args.sessionId))
        .order("asc")
        .collect(),
      ctx.db
        .query("viewerSessions")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .first(),
    ]);

    const sessionData = {
      chatState: {
        messages: messages || [],
        messageCount: messages?.length || 0,
        sessionTitle: session.title,
      },
      viewerState: viewerState?.viewerState,
      aiWorkflowState: session.aiWorkflowState,
      userInteractions: viewerState?.interactions,
    };

    const dataSize = JSON.stringify(sessionData).length;
    const checksum = generateChecksum(sessionData);

    return await ctx.db.insert("sessionSnapshots", {
      userId: args.userId,
      sessionId: args.sessionId,
      snapshotType: "checkpoint",
      timestamp: Date.now(),
      data: sessionData,
      metadata: {
        size: dataSize,
        checksum,
        description: args.description,
        tags: args.tags,
      },
      isRecoverable: true,
      expiresAt: undefined, // Checkpoints don't expire
    });
  },
});

// Restore session from snapshot
export const restoreFromSnapshot = mutation({
  args: {
    snapshotId: v.id("sessionSnapshots"),
    userId: v.string(),
    createNewSession: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const snapshot = await ctx.db.get(args.snapshotId);
    if (!snapshot || snapshot.userId !== args.userId) {
      throw new Error("Snapshot not found or unauthorized");
    }

    if (!snapshot.isRecoverable) {
      throw new Error("Snapshot is not recoverable");
    }

    let targetSessionId = snapshot.sessionId;

    // Create new session if requested
    if (args.createNewSession) {
      targetSessionId = await ctx.db.insert("chatSessions", {
        userId: args.userId,
        title: `${snapshot.data.chatState.sessionTitle} (Restored)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastAccessedAt: Date.now(),
        messageCount: snapshot.data.chatState.messageCount,
        isActive: true,
        tags: ["restored"],
        description: `Restored from snapshot created on ${new Date(snapshot.timestamp).toLocaleString()}`,
        settings: {
          autoSave: true,
          notificationsEnabled: true,
        },
      });

      // Set other sessions to inactive
      const activeSessions = await ctx.db
        .query("chatSessions")
        .withIndex("by_user_active", (q) => q.eq("userId", args.userId).eq("isActive", true))
        .collect();

      for (const session of activeSessions) {
        if (session._id !== targetSessionId) {
          await ctx.db.patch(session._id, { isActive: false });
        }
      }
    }

    // Restore chat messages
    if (snapshot.data.chatState.messages && snapshot.data.chatState.messages.length > 0) {
      // Clear existing messages if restoring to same session
      if (!args.createNewSession) {
        const existingMessages = await ctx.db
          .query("chatMessages")
          .withIndex("by_session", (q) => q.eq("sessionId", targetSessionId))
          .collect();

        for (const message of existingMessages) {
          await ctx.db.delete(message._id);
        }
      }

      // Insert restored messages
      for (const message of snapshot.data.chatState.messages) {
        await ctx.db.insert("chatMessages", {
          sessionId: targetSessionId,
          userId: message.userId,
          content: message.content,
          timestamp: message.timestamp,
          type: message.type,
          status: message.status,
          metadata: message.metadata,
        });
      }
    }

    // Restore viewer state
    if (snapshot.data.viewerState) {
      const existingViewerSession = await ctx.db
        .query("viewerSessions")
        .withIndex("by_session", (q) => q.eq("sessionId", targetSessionId))
        .first();

      if (existingViewerSession) {
        await ctx.db.patch(existingViewerSession._id, {
          viewerState: snapshot.data.viewerState,
          interactions: snapshot.data.userInteractions || [],
          lastSaved: Date.now(),
        });
      } else {
        await ctx.db.insert("viewerSessions", {
          userId: args.userId,
          sessionId: targetSessionId,
          viewerState: snapshot.data.viewerState,
          interactions: snapshot.data.userInteractions || [],
          lastSaved: Date.now(),
          autoSaveEnabled: true,
        });
      }
    }

    // Restore AI workflow state
    if (snapshot.data.aiWorkflowState) {
      await ctx.db.patch(targetSessionId, {
        aiWorkflowState: snapshot.data.aiWorkflowState,
        updatedAt: Date.now(),
      });
    }

    return targetSessionId;
  },
});

// Helper function to generate checksum
function generateChecksum(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}