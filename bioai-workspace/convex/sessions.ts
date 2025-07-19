import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

// Batch update session data for efficient auto-save
export const updateSessionBatch = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    userId: v.string(),
    batchData: v.object({
      chatState: v.optional(v.object({
        messageCount: v.optional(v.number()),
        sessionTitle: v.optional(v.string()),
        inputValue: v.optional(v.string()),
      })),
      viewerState: v.optional(v.object({
        structures: v.optional(v.array(v.object({
          id: v.string(),
          url: v.string(),
          name: v.string(),
          loadedAt: v.number(),
        }))),
        camera: v.optional(v.object({})),
        representations: v.optional(v.array(v.object({}))),
        selections: v.optional(v.array(v.object({}))),
        measurements: v.optional(v.array(v.object({}))),
        annotations: v.optional(v.array(v.object({}))),
        viewingMode: v.optional(v.string()),
        visualization: v.optional(v.object({
          lighting: v.optional(v.object({})),
          quality: v.optional(v.string()),
          transparency: v.optional(v.number()),
        })),
      })),
      aiWorkflowState: v.optional(v.object({
        currentWorkflow: v.optional(v.string()),
        workflowHistory: v.optional(v.array(v.object({}))),
        conversationMemory: v.optional(v.object({})),
        toolStates: v.optional(v.object({})),
      })),
      interactions: v.optional(v.array(v.object({
        type: v.string(),
        timestamp: v.number(),
        data: v.object({}),
      }))),
    }),
  },
  handler: async (ctx, args) => {
    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found or unauthorized");
    }

    const now = Date.now();

    // Update chat session if needed
    if (args.batchData.chatState) {
      const chatUpdates: Partial<Doc<"chatSessions">> = {
        updatedAt: now,
        lastAccessedAt: now,
      };

      if (args.batchData.chatState.messageCount !== undefined) {
        chatUpdates.messageCount = args.batchData.chatState.messageCount;
      }

      if (args.batchData.chatState.sessionTitle) {
        chatUpdates.title = args.batchData.chatState.sessionTitle;
      }

      await ctx.db.patch(args.sessionId, chatUpdates);
    }

    // Update AI workflow state if needed
    if (args.batchData.aiWorkflowState) {
      const existingState = session.aiWorkflowState || {};
      const mergedState = {
        ...existingState,
        ...args.batchData.aiWorkflowState,
      };

      await ctx.db.patch(args.sessionId, {
        aiWorkflowState: mergedState,
        updatedAt: now,
      });
    }

    // Update viewer state if needed
    if (args.batchData.viewerState || args.batchData.interactions) {
      const existingViewerSession = await ctx.db
        .query("viewerSessions")
        .withIndex("by_user_session", (q) => q.eq("userId", args.userId).eq("sessionId", args.sessionId))
        .first();

      if (existingViewerSession) {
        const updates: Partial<Doc<"viewerSessions">> = {
          lastSaved: now,
        };

        if (args.batchData.viewerState) {
          updates.viewerState = {
            ...existingViewerSession.viewerState,
            ...args.batchData.viewerState,
          };
        }

        if (args.batchData.interactions) {
          const existingInteractions = existingViewerSession.interactions || [];
          const newInteractions = [...existingInteractions, ...args.batchData.interactions];
          updates.interactions = newInteractions.slice(-100); // Keep last 100 interactions
        }

        await ctx.db.patch(existingViewerSession._id, updates);
      } else if (args.batchData.viewerState) {
        // Create new viewer session
        await ctx.db.insert("viewerSessions", {
          userId: args.userId,
          sessionId: args.sessionId,
          viewerState: {
            structures: args.batchData.viewerState.structures || [],
            camera: args.batchData.viewerState.camera,
            representations: args.batchData.viewerState.representations || [],
            selections: args.batchData.viewerState.selections || [],
            measurements: args.batchData.viewerState.measurements || [],
            annotations: args.batchData.viewerState.annotations || [],
            viewingMode: args.batchData.viewerState.viewingMode || "default",
            visualization: args.batchData.viewerState.visualization || {
              lighting: undefined,
              quality: "medium",
              transparency: 0.5,
            },
          },
          interactions: args.batchData.interactions || [],
          lastSaved: now,
          autoSaveEnabled: true,
        });
      }
    }

    return { success: true, timestamp: now };
  },
});

// Get comprehensive session state
export const getSessionState = query({
  args: {
    sessionId: v.id("chatSessions"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found or unauthorized");
    }

    // Get all related data
    const [messages, viewerSession, snapshots] = await Promise.all([
      ctx.db
        .query("chatMessages")
        .withIndex("by_session_timestamp", (q) => q.eq("sessionId", args.sessionId))
        .order("asc")
        .collect(),
      ctx.db
        .query("viewerSessions")
        .withIndex("by_user_session", (q) => q.eq("userId", args.userId).eq("sessionId", args.sessionId))
        .first(),
      ctx.db
        .query("sessionSnapshots")
        .withIndex("by_session_timestamp", (q) => q.eq("sessionId", args.sessionId))
        .order("desc")
        .take(5), // Get last 5 snapshots
    ]);

    return {
      session,
      chatState: {
        messages: messages || [],
        messageCount: messages?.length || 0,
      },
      viewerState: viewerSession?.viewerState,
      interactions: viewerSession?.interactions || [],
      snapshots: snapshots || [],
      lastSaved: viewerSession?.lastSaved || session.updatedAt,
    };
  },
});

// Auto-save session data
export const autoSaveSession = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    userId: v.string(),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    createSnapshot: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found or unauthorized");
    }

    const now = Date.now();

    // Update last accessed time
    await ctx.db.patch(args.sessionId, {
      lastAccessedAt: now,
      updatedAt: now,
    });

    // Create auto-snapshot if requested or if high priority
    if (args.createSnapshot || args.priority === "high") {
      const [messages, viewerSession] = await Promise.all([
        ctx.db
          .query("chatMessages")
          .withIndex("by_session_timestamp", (q) => q.eq("sessionId", args.sessionId))
          .order("asc")
          .collect(),
        ctx.db
          .query("viewerSessions")
          .withIndex("by_user_session", (q) => q.eq("userId", args.userId).eq("sessionId", args.sessionId))
          .first(),
      ]);

      const sessionData = {
        chatState: {
          messages: messages || [],
          messageCount: messages?.length || 0,
          sessionTitle: session.title,
        },
        viewerState: viewerSession?.viewerState,
        aiWorkflowState: session.aiWorkflowState,
        userInteractions: viewerSession?.interactions,
      };

      const dataSize = JSON.stringify(sessionData).length;

      await ctx.db.insert("sessionSnapshots", {
        userId: args.userId,
        sessionId: args.sessionId,
        snapshotType: "auto",
        timestamp: now,
        data: sessionData,
        metadata: {
          size: dataSize,
          description: "Auto-saved session state",
        },
        isRecoverable: true,
        expiresAt: now + (30 * 24 * 60 * 60 * 1000), // 30 days
      });
    }

    return { success: true, timestamp: now };
  },
});

// Initialize session restoration
export const initializeSessionRestore = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the most recent active session
    const activeSession = await ctx.db
      .query("chatSessions")
      .withIndex("by_user_active", (q) => q.eq("userId", args.userId).eq("isActive", true))
      .first();

    if (activeSession) {
      // Update last accessed time
      await ctx.db.patch(activeSession._id, {
        lastAccessedAt: Date.now(),
      });

      return {
        hasActiveSession: true,
        sessionId: activeSession._id,
        sessionTitle: activeSession.title,
        lastAccessed: activeSession.lastAccessedAt,
      };
    }

    // Get the most recently accessed session
    const recentSession = await ctx.db
      .query("chatSessions")
      .withIndex("by_user_last_accessed", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();

    if (recentSession) {
      // Make it active
      await ctx.db.patch(recentSession._id, {
        isActive: true,
        lastAccessedAt: Date.now(),
      });

      return {
        hasActiveSession: false,
        sessionId: recentSession._id,
        sessionTitle: recentSession.title,
        lastAccessed: recentSession.lastAccessedAt,
        restored: true,
      };
    }

    return {
      hasActiveSession: false,
      sessionId: null,
      needsNewSession: true,
    };
  },
});

// Session recovery and integrity check
export const validateSessionIntegrity = query({
  args: {
    sessionId: v.id("chatSessions"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found or unauthorized");
    }

    // Check message count consistency
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const actualMessageCount = messages.length;
    const storedMessageCount = session.messageCount;

    // Check for orphaned viewer sessions
    const viewerSessions = await ctx.db
      .query("viewerSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Check for recent snapshots
    const recentSnapshots = await ctx.db
      .query("sessionSnapshots")
      .withIndex("by_session_timestamp", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(3);

    const issues = [];

    if (actualMessageCount !== storedMessageCount) {
      issues.push({
        type: "message_count_mismatch",
        expected: storedMessageCount,
        actual: actualMessageCount,
        severity: "warning",
      });
    }

    if (viewerSessions.length > 1) {
      issues.push({
        type: "duplicate_viewer_sessions",
        count: viewerSessions.length,
        severity: "warning",
      });
    }

    return {
      isValid: issues.length === 0,
      issues,
      stats: {
        messageCount: actualMessageCount,
        viewerSessionCount: viewerSessions.length,
        snapshotCount: recentSnapshots.length,
        lastUpdated: session.updatedAt,
        lastAccessed: session.lastAccessedAt,
      },
    };
  },
});

// Repair session integrity issues
export const repairSessionIntegrity = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    userId: v.string(),
    repairOptions: v.object({
      fixMessageCount: v.optional(v.boolean()),
      removeDuplicateViewerSessions: v.optional(v.boolean()),
      createBackupSnapshot: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found or unauthorized");
    }

    const repairActions = [];

    // Create backup snapshot if requested
    if (args.repairOptions.createBackupSnapshot) {
      const [messages, viewerSession] = await Promise.all([
        ctx.db
          .query("chatMessages")
          .withIndex("by_session_timestamp", (q) => q.eq("sessionId", args.sessionId))
          .order("asc")
          .collect(),
        ctx.db
          .query("viewerSessions")
          .withIndex("by_user_session", (q) => q.eq("userId", args.userId).eq("sessionId", args.sessionId))
          .first(),
      ]);

      const backupData = {
        chatState: {
          messages: messages || [],
          messageCount: messages?.length || 0,
          sessionTitle: session.title,
        },
        viewerState: viewerSession?.viewerState,
        aiWorkflowState: session.aiWorkflowState,
        userInteractions: viewerSession?.interactions,
      };

      await ctx.db.insert("sessionSnapshots", {
        userId: args.userId,
        sessionId: args.sessionId,
        snapshotType: "manual",
        timestamp: Date.now(),
        data: backupData,
        metadata: {
          size: JSON.stringify(backupData).length,
          description: "Pre-repair backup",
          tags: ["repair", "backup"],
        },
        isRecoverable: true,
        expiresAt: Date.now() + (90 * 24 * 60 * 60 * 1000), // 90 days
      });

      repairActions.push("Created backup snapshot");
    }

    // Fix message count
    if (args.repairOptions.fixMessageCount) {
      const messages = await ctx.db
        .query("chatMessages")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .collect();

      await ctx.db.patch(args.sessionId, {
        messageCount: messages.length,
        updatedAt: Date.now(),
      });

      repairActions.push(`Fixed message count to ${messages.length}`);
    }

    // Remove duplicate viewer sessions
    if (args.repairOptions.removeDuplicateViewerSessions) {
      const viewerSessions = await ctx.db
        .query("viewerSessions")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .collect();

      if (viewerSessions.length > 1) {
        // Keep the most recent one
        const sortedSessions = viewerSessions.sort((a, b) => b.lastSaved - a.lastSaved);
        const sessionsToDelete = sortedSessions.slice(1);

        for (const session of sessionsToDelete) {
          await ctx.db.delete(session._id);
        }

        repairActions.push(`Removed ${sessionsToDelete.length} duplicate viewer sessions`);
      }
    }

    return {
      success: true,
      actionsPerformed: repairActions,
      timestamp: Date.now(),
    };
  },
});

// Get session analytics
export const getSessionAnalytics = query({
  args: {
    userId: v.string(),
    timeRange: v.optional(v.union(v.literal("day"), v.literal("week"), v.literal("month"), v.literal("all"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let timeFilter = 0;

    switch (args.timeRange) {
      case "day":
        timeFilter = now - (24 * 60 * 60 * 1000);
        break;
      case "week":
        timeFilter = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        timeFilter = now - (30 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeFilter = 0;
    }

    const [sessions, messages, viewerSessions, snapshots] = await Promise.all([
      ctx.db
        .query("chatSessions")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.gte(q.field("createdAt"), timeFilter))
        .collect(),
      ctx.db
        .query("chatMessages")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.gte(q.field("timestamp"), timeFilter))
        .collect(),
      ctx.db
        .query("viewerSessions")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.gte(q.field("lastSaved"), timeFilter))
        .collect(),
      ctx.db
        .query("sessionSnapshots")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.gte(q.field("timestamp"), timeFilter))
        .collect(),
    ]);

    const analytics = {
      timeRange: args.timeRange || "all",
      sessions: {
        total: sessions.length,
        active: sessions.filter(s => s.isActive).length,
        withTags: sessions.filter(s => s.tags && s.tags.length > 0).length,
        avgMessageCount: sessions.reduce((sum, s) => sum + s.messageCount, 0) / sessions.length || 0,
      },
      messages: {
        total: messages.length,
        userMessages: messages.filter(m => m.type === "user").length,
        assistantMessages: messages.filter(m => m.type === "assistant").length,
        avgPerSession: messages.length / sessions.length || 0,
      },
      viewerSessions: {
        total: viewerSessions.length,
        withStructures: viewerSessions.filter(vs => vs.viewerState.structures.length > 0).length,
        avgStructuresPerSession: viewerSessions.reduce((sum, vs) => sum + vs.viewerState.structures.length, 0) / viewerSessions.length || 0,
        totalInteractions: viewerSessions.reduce((sum, vs) => sum + (vs.interactions?.length || 0), 0),
      },
      snapshots: {
        total: snapshots.length,
        auto: snapshots.filter(s => s.snapshotType === "auto").length,
        manual: snapshots.filter(s => s.snapshotType === "manual").length,
        checkpoints: snapshots.filter(s => s.snapshotType === "checkpoint").length,
        totalSize: snapshots.reduce((sum, s) => sum + (s.metadata?.size || 0), 0),
      },
    };

    return analytics;
  },
});