// AI Workflow Management Functions
// Convex functions for persisting and managing AI workflow state

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new AI workflow
export const createWorkflow = mutation({
  args: {
    workflowId: v.string(),
    userId: v.string(),
    sessionId: v.string(),
    workflowType: v.string(),
    totalSteps: v.number(),
    metadata: v.object({
      version: v.string(),
      performance: v.object({
        totalTokens: v.number(),
        totalDuration: v.number(),
        apiCalls: v.number(),
        cacheHits: v.number(),
      }),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiWorkflows", {
      workflowId: args.workflowId,
      userId: args.userId,
      sessionId: args.sessionId,
      workflowType: args.workflowType,
      status: "running",
      progress: 0,
      currentStep: "initialization",
      totalSteps: args.totalSteps,
      startTime: Date.now(),
      metadata: args.metadata,
    });
  },
});

// Update workflow progress
export const updateWorkflowProgress = mutation({
  args: {
    workflowId: v.string(),
    progress: v.number(),
    currentStep: v.string(),
    estimatedCompletion: v.optional(v.number()),
    metadata: v.optional(v.object({
      version: v.string(),
      performance: v.object({
        totalTokens: v.number(),
        totalDuration: v.number(),
        apiCalls: v.number(),
        cacheHits: v.number(),
      }),
    })),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db
      .query("aiWorkflows")
      .withIndex("by_workflow_id", (q) => q.eq("workflowId", args.workflowId))
      .first();

    if (!workflow) {
      throw new Error(`Workflow ${args.workflowId} not found`);
    }

    const updateData: Partial<any> = {
      progress: args.progress,
      currentStep: args.currentStep,
    };

    if (args.estimatedCompletion) {
      updateData.estimatedCompletion = args.estimatedCompletion;
    }

    if (args.metadata) {
      updateData.metadata = args.metadata;
    }

    return await ctx.db.patch(workflow._id, updateData);
  },
});

// Complete workflow
export const completeWorkflow = mutation({
  args: {
    workflowId: v.string(),
    status: v.union(v.literal("completed"), v.literal("failed"), v.literal("cancelled")),
    finalMetadata: v.optional(v.object({
      version: v.string(),
      performance: v.object({
        totalTokens: v.number(),
        totalDuration: v.number(),
        apiCalls: v.number(),
        cacheHits: v.number(),
      }),
    })),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db
      .query("aiWorkflows")
      .withIndex("by_workflow_id", (q) => q.eq("workflowId", args.workflowId))
      .first();

    if (!workflow) {
      throw new Error(`Workflow ${args.workflowId} not found`);
    }

    const updateData: Partial<any> = {
      status: args.status,
      endTime: Date.now(),
      progress: args.status === "completed" ? 100 : workflow.progress,
    };

    if (args.finalMetadata) {
      updateData.metadata = args.finalMetadata;
    }

    return await ctx.db.patch(workflow._id, updateData);
  },
});

// Store workflow result
export const storeWorkflowResult = mutation({
  args: {
    workflowId: v.string(),
    userId: v.string(),
    sessionId: v.string(),
    result: v.object({
      response: v.string(),
      actions: v.array(v.object({
        id: v.string(),
        type: v.string(),
        description: v.string(),
        result: v.any(),
        timestamp: v.number(),
        duration: v.number(),
        success: v.boolean(),
        metadata: v.any(),
      })),
      newContext: v.any(),
      suggestedFollowUps: v.array(v.string()),
      metadata: v.object({
        tokensUsed: v.number(),
        duration: v.number(),
        toolsInvoked: v.array(v.string()),
        confidence: v.number(),
        sources: v.array(v.string()),
      }),
      status: v.union(v.literal("completed"), v.literal("partial"), v.literal("failed"), v.literal("requires_input")),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("workflowResults", {
      workflowId: args.workflowId,
      userId: args.userId,
      sessionId: args.sessionId,
      result: args.result,
      createdAt: Date.now(),
    });
  },
});

// Add workflow history entry
export const addWorkflowHistory = mutation({
  args: {
    userId: v.string(),
    sessionId: v.string(),
    workflowId: v.string(),
    userMessage: v.string(),
    aiResponse: v.string(),
    actions: v.array(v.object({
      id: v.string(),
      type: v.string(),
      description: v.string(),
      result: v.any(),
      timestamp: v.number(),
      duration: v.number(),
      success: v.boolean(),
      metadata: v.any(),
    })),
    context: v.any(),
    metadata: v.object({
      duration: v.number(),
      tokensUsed: v.number(),
      toolsUsed: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("workflowHistory", {
      userId: args.userId,
      sessionId: args.sessionId,
      workflowId: args.workflowId,
      userMessage: args.userMessage,
      aiResponse: args.aiResponse,
      actions: args.actions,
      context: args.context,
      metadata: args.metadata,
      timestamp: Date.now(),
    });
  },
});

// Update conversation context
export const updateConversationContext = mutation({
  args: {
    userId: v.string(),
    sessionId: v.string(),
    context: v.object({
      lastUpdated: v.number(),
      molecularState: v.object({
        activeStructure: v.optional(v.string()),
        selectedElements: v.array(v.string()),
        viewerSettings: v.any(),
        analysisResults: v.array(v.any()),
        searchHistory: v.array(v.string()),
      }),
      userPreferences: v.object({
        expertiseLevel: v.union(v.literal("novice"), v.literal("intermediate"), v.literal("expert")),
        preferredFormat: v.union(v.literal("concise"), v.literal("detailed"), v.literal("technical")),
        domains: v.array(v.string()),
        analysisDepth: v.union(v.literal("basic"), v.literal("intermediate"), v.literal("advanced")),
        visualizations: v.boolean(),
        notifications: v.boolean(),
      }),
      sessionSummary: v.object({
        mainTopics: v.array(v.string()),
        completedAnalyses: v.array(v.string()),
        pendingTasks: v.array(v.string()),
        keyInsights: v.array(v.string()),
        toolsUsed: v.array(v.string()),
        messageCount: v.number(),
        duration: v.number(),
      }),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("conversationContext")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .first();

    if (existing) {
      return await ctx.db.patch(existing._id, {
        context: args.context,
        updatedAt: Date.now(),
      });
    } else {
      return await ctx.db.insert("conversationContext", {
        userId: args.userId,
        sessionId: args.sessionId,
        context: args.context,
        updatedAt: Date.now(),
      });
    }
  },
});

// Query functions
export const getWorkflowStatus = query({
  args: { workflowId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiWorkflows")
      .withIndex("by_workflow_id", (q) => q.eq("workflowId", args.workflowId))
      .first();
  },
});

export const getUserWorkflows = query({
  args: { 
    userId: v.string(),
    limit: v.optional(v.number()),
    status: v.optional(v.union(v.literal("running"), v.literal("completed"), v.literal("failed"), v.literal("cancelled"), v.literal("paused"))),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("aiWorkflows")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const orderedQuery = query.order("desc");

    if (args.limit) {
      return await orderedQuery.take(args.limit);
    }

    return await orderedQuery.collect();
  },
});

export const getSessionWorkflows = query({
  args: { 
    sessionId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("aiWorkflows")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc");

    if (args.limit) {
      return await query.take(args.limit);
    }

    return await query.collect();
  },
});

export const getWorkflowResult = query({
  args: { workflowId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workflowResults")
      .withIndex("by_workflow_id", (q) => q.eq("workflowId", args.workflowId))
      .first();
  },
});

export const getWorkflowHistory = query({
  args: {
    userId: v.string(),
    sessionId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Start with the base query, filtering by user
    let query;
    if (args.sessionId) {
      query = ctx.db
        .query("workflowHistory")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId!))
        .filter((q) => q.eq(q.field("userId"), args.userId));
    } else {
      query = ctx.db
        .query("workflowHistory")
        .withIndex("by_user", (q) => q.eq("userId", args.userId));
    }
    const baseQuery = query.order("desc");
    if (args.limit) {
      return await baseQuery.take(args.limit);
    } else {
      return await baseQuery.collect();
    }
  },
});

export const getConversationContext = query({
  args: { 
    userId: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversationContext")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .first();
  },
});

// Utility functions
export const getActiveWorkflows = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiWorkflows")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "running"))
      .collect();
  },
});

export const getWorkflowStats = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const workflows = await ctx.db
      .query("aiWorkflows")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const stats = {
      total: workflows.length,
      completed: workflows.filter(w => w.status === "completed").length,
      failed: workflows.filter(w => w.status === "failed").length,
      running: workflows.filter(w => w.status === "running").length,
      cancelled: workflows.filter(w => w.status === "cancelled").length,
      averageDuration: 0,
      totalTokens: 0,
    };

    const completedWorkflows = workflows.filter(w => w.status === "completed" && w.endTime);
    if (completedWorkflows.length > 0) {
      const totalDuration = completedWorkflows.reduce((sum, w) => 
        sum + (w.endTime! - w.startTime), 0);
      stats.averageDuration = totalDuration / completedWorkflows.length;
    }

    stats.totalTokens = workflows.reduce((sum, w) => 
      sum + (w.metadata?.performance?.totalTokens || 0), 0);

    return stats;
  },
});

// Cleanup functions
export const cleanupOldWorkflows = mutation({
  args: { 
    userId: v.string(),
    olderThanDays: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - (args.olderThanDays * 24 * 60 * 60 * 1000);
    
    const oldWorkflows = await ctx.db
      .query("aiWorkflows")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.lt(q.field("startTime"), cutoffTime))
      .collect();

    const deletedCount = oldWorkflows.length;
    
    // Delete workflows and related data
    for (const workflow of oldWorkflows) {
      await ctx.db.delete(workflow._id);
      
      // Delete related results
      const results = await ctx.db
        .query("workflowResults")
        .withIndex("by_workflow_id", (q) => q.eq("workflowId", workflow.workflowId))
        .collect();
      
      for (const result of results) {
        await ctx.db.delete(result._id);
      }
      
      // Delete related history
      const history = await ctx.db
        .query("workflowHistory")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("workflowId"), workflow.workflowId))
        .collect();
      
      for (const hist of history) {
        await ctx.db.delete(hist._id);
      }
    }

    return { deleted: deletedCount };
  },
});

export const resetUserWorkflows = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Delete all workflows for user
    const workflows = await ctx.db
      .query("aiWorkflows")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const workflow of workflows) {
      await ctx.db.delete(workflow._id);
    }

    // Delete all results for user
    const results = await ctx.db
      .query("workflowResults")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const result of results) {
      await ctx.db.delete(result._id);
    }

    // Delete all history for user
    const history = await ctx.db
      .query("workflowHistory")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const hist of history) {
      await ctx.db.delete(hist._id);
    }

    // Delete all conversation context for user
    const contexts = await ctx.db
      .query("conversationContext")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const context of contexts) {
      await ctx.db.delete(context._id);
    }

    return { 
      deleted: {
        workflows: workflows.length,
        results: results.length,
        history: history.length,
        contexts: contexts.length,
      }
    };
  },
});