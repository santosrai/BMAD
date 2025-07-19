import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createSession = mutation({
  args: {
    userId: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const title = args.title || `Chat Session ${new Date(now).toLocaleString()}`;
    
    // Set all other sessions to inactive
    const existingSessions = await ctx.db
      .query("chatSessions")
      .withIndex("by_user_active", (q) => q.eq("userId", args.userId).eq("isActive", true))
      .collect();
    
    for (const session of existingSessions) {
      await ctx.db.patch(session._id, { isActive: false });
    }
    
    // Create new session
    const sessionId = await ctx.db.insert("chatSessions", {
      userId: args.userId,
      title,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
      isActive: true,
    });
    
    return sessionId;
  },
});

export const getUserSessions = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatSessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const getActiveSession = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatSessions")
      .withIndex("by_user_active", (q) => q.eq("userId", args.userId).eq("isActive", true))
      .first();
  },
});

export const switchSession = mutation({
  args: {
    userId: v.string(),
    sessionId: v.id("chatSessions"),
  },
  handler: async (ctx, args) => {
    // Set all sessions to inactive
    const existingSessions = await ctx.db
      .query("chatSessions")
      .withIndex("by_user_active", (q) => q.eq("userId", args.userId).eq("isActive", true))
      .collect();
    
    for (const session of existingSessions) {
      await ctx.db.patch(session._id, { isActive: false });
    }
    
    // Set target session to active
    await ctx.db.patch(args.sessionId, { isActive: true });
  },
});

export const deleteSession = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found or unauthorized");
    }
    
    // Delete all messages in the session
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
    
    // Delete the session
    await ctx.db.delete(args.sessionId);
  },
});

export const addMessage = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    userId: v.string(),
    content: v.string(),
    type: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    status: v.optional(v.union(v.literal("sending"), v.literal("sent"), v.literal("error"))),
    metadata: v.optional(v.object({
      error: v.optional(v.string()),
      processingTime: v.optional(v.number()),
      tokenCount: v.optional(v.number()),
      // AI workflow related fields
      workflowId: v.optional(v.string()),
      tokensUsed: v.optional(v.number()),
      toolsInvoked: v.optional(v.array(v.string())),
      confidence: v.optional(v.number()),
      sources: v.optional(v.array(v.string())),
      suggestedFollowUps: v.optional(v.array(v.string())),
      fallback: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found or unauthorized");
    }
    
    // Add message
    const messageId = await ctx.db.insert("chatMessages", {
      sessionId: args.sessionId,
      userId: args.userId,
      content: args.content,
      timestamp: now,
      type: args.type,
      status: args.status || "sent",
      metadata: args.metadata,
    });
    
    // Update session
    await ctx.db.patch(args.sessionId, {
      updatedAt: now,
      messageCount: session.messageCount + 1,
    });
    
    return messageId;
  },
});

export const updateMessageStatus = mutation({
  args: {
    messageId: v.id("chatMessages"),
    userId: v.string(),
    status: v.union(v.literal("sending"), v.literal("sent"), v.literal("error")),
    metadata: v.optional(v.object({
      error: v.optional(v.string()),
      processingTime: v.optional(v.number()),
      tokenCount: v.optional(v.number()),
      // AI workflow related fields
      workflowId: v.optional(v.string()),
      tokensUsed: v.optional(v.number()),
      toolsInvoked: v.optional(v.array(v.string())),
      confidence: v.optional(v.number()),
      sources: v.optional(v.array(v.string())),
      suggestedFollowUps: v.optional(v.array(v.string())),
      fallback: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message || message.userId !== args.userId) {
      throw new Error("Message not found or unauthorized");
    }
    
    await ctx.db.patch(args.messageId, {
      status: args.status,
      metadata: args.metadata,
    });
  },
});

export const getSessionMessages = query({
  args: {
    sessionId: v.id("chatSessions"),
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found or unauthorized");
    }
    
    const query = ctx.db
      .query("chatMessages")
      .withIndex("by_session_timestamp", (q) => q.eq("sessionId", args.sessionId))
      .order("asc");
    
    if (args.limit) {
      return await query.take(args.limit);
    }
    
    return await query.collect();
  },
});

export const clearSessionMessages = mutation({
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
    
    // Delete all messages in the session
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
    
    // Update session message count
    await ctx.db.patch(args.sessionId, {
      messageCount: 0,
      updatedAt: Date.now(),
    });
  },
});

// Enhanced session management for persistence
export const updateSessionState = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    userId: v.string(),
    updates: v.object({
      title: v.optional(v.string()),
      messageCount: v.optional(v.number()),
      lastAccessedAt: v.optional(v.number()),
      tags: v.optional(v.array(v.string())),
      description: v.optional(v.string()),
      settings: v.optional(v.object({
        autoSave: v.boolean(),
        notificationsEnabled: v.boolean(),
        theme: v.optional(v.string()),
      })),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found or unauthorized");
    }

    await ctx.db.patch(args.sessionId, {
      ...args.updates,
      updatedAt: Date.now(),
      lastAccessedAt: Date.now(),
    });
  },
});

export const updateAIWorkflowState = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    userId: v.string(),
    aiWorkflowState: v.object({
      currentWorkflow: v.optional(v.string()),
      workflowHistory: v.optional(v.array(v.any())),
      conversationMemory: v.optional(v.any()),
      toolStates: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found or unauthorized");
    }

    await ctx.db.patch(args.sessionId, {
      aiWorkflowState: args.aiWorkflowState,
      updatedAt: Date.now(),
    });
  },
});

export const getSession = query({
  args: {
    sessionId: v.id("chatSessions"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found or unauthorized");
    }
    return session;
  },
});

export const getSessionsWithMetadata = query({
  args: {
    userId: v.string(),
    includeInactive: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("chatSessions")
      .withIndex("by_user_last_accessed", (q) => q.eq("userId", args.userId));

    if (!args.includeInactive) {
      query = query.filter((q) => q.eq(q.field("isActive"), true));
    }

    if (args.limit) {
      return await query.order("desc").take(args.limit);
    }

    return await query.order("desc").collect();
  },
});

export const createSessionWithMetadata = mutation({
  args: {
    userId: v.string(),
    title: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    settings: v.optional(v.object({
      autoSave: v.boolean(),
      notificationsEnabled: v.boolean(),
      theme: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const title = args.title || `Chat Session ${new Date(now).toLocaleString()}`;
    
    // Set all other sessions to inactive
    const existingSessions = await ctx.db
      .query("chatSessions")
      .withIndex("by_user_active", (q) => q.eq("userId", args.userId).eq("isActive", true))
      .collect();
    
    for (const session of existingSessions) {
      await ctx.db.patch(session._id, { isActive: false });
    }
    
    // Create new session with enhanced metadata
    const sessionId = await ctx.db.insert("chatSessions", {
      userId: args.userId,
      title,
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      messageCount: 0,
      isActive: true,
      tags: args.tags || [],
      description: args.description,
      settings: args.settings || {
        autoSave: true,
        notificationsEnabled: true,
      },
    });
    
    return sessionId;
  },
});

export const updateSessionTags = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    userId: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found or unauthorized");
    }

    await ctx.db.patch(args.sessionId, {
      tags: args.tags,
      updatedAt: Date.now(),
    });
  },
});

export const searchSessions = query({
  args: {
    userId: v.string(),
    searchTerm: v.string(),
    tags: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let sessions = await ctx.db
      .query("chatSessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter by search term
    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      sessions = sessions.filter(session => 
        session.title.toLowerCase().includes(searchLower) ||
        session.description?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by tags
    if (args.tags && args.tags.length > 0) {
      sessions = sessions.filter(session => 
        args.tags!.some(tag => session.tags?.includes(tag))
      );
    }

    // Apply limit
    if (args.limit) {
      sessions = sessions.slice(0, args.limit);
    }

    return sessions.sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0));
  },
});