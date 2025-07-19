import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create or update viewer session state
export const updateViewerState = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    userId: v.string(),
    viewerState: v.object({
      structures: v.optional(v.array(v.object({
        id: v.string(),
        url: v.string(),
        name: v.string(),
        loadedAt: v.number(),
      }))),
      camera: v.optional(v.any()),
      representations: v.optional(v.array(v.any())),
      selections: v.optional(v.array(v.any())),
      measurements: v.optional(v.array(v.any())),
      annotations: v.optional(v.array(v.any())),
      viewingMode: v.optional(v.string()),
      visualization: v.optional(v.object({
        lighting: v.optional(v.any()),
        quality: v.optional(v.string()),
        transparency: v.optional(v.number()),
      })),
    }),
  },
  handler: async (ctx, args) => {
    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found or unauthorized");
    }

    // Check if viewer session exists
    const existing = await ctx.db
      .query("viewerSessions")
      .withIndex("by_user_session", (q) => q.eq("userId", args.userId).eq("sessionId", args.sessionId))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing viewer session
      await ctx.db.patch(existing._id, {
        viewerState: {
          structures: args.viewerState.structures || existing.viewerState.structures,
          camera: args.viewerState.camera || existing.viewerState.camera,
          representations: args.viewerState.representations || existing.viewerState.representations,
          selections: args.viewerState.selections || existing.viewerState.selections,
          measurements: args.viewerState.measurements || existing.viewerState.measurements,
          annotations: args.viewerState.annotations || existing.viewerState.annotations,
          viewingMode: args.viewerState.viewingMode || existing.viewerState.viewingMode,
          visualization: args.viewerState.visualization || existing.viewerState.visualization,
        },
        lastSaved: now,
      });
    } else {
      // Create new viewer session
      await ctx.db.insert("viewerSessions", {
        userId: args.userId,
        sessionId: args.sessionId,
        viewerState: {
          structures: args.viewerState.structures || [],
          camera: args.viewerState.camera,
          representations: args.viewerState.representations || [],
          selections: args.viewerState.selections || [],
          measurements: args.viewerState.measurements || [],
          annotations: args.viewerState.annotations || [],
          viewingMode: args.viewerState.viewingMode || "default",
          visualization: args.viewerState.visualization || {
            lighting: undefined,
            quality: "medium",
            transparency: 0.5,
          },
        },
        interactions: [],
        lastSaved: now,
        autoSaveEnabled: true,
      });
    }
  },
});

// Get viewer session state
export const getViewerState = query({
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

    return await ctx.db
      .query("viewerSessions")
      .withIndex("by_user_session", (q) => q.eq("userId", args.userId).eq("sessionId", args.sessionId))
      .first();
  },
});

// Update user interactions
export const updateInteractions = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    userId: v.string(),
    interactions: v.array(v.object({
      type: v.string(),
      timestamp: v.number(),
      data: v.any(),
    })),
  },
  handler: async (ctx, args) => {
    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found or unauthorized");
    }

    const existing = await ctx.db
      .query("viewerSessions")
      .withIndex("by_user_session", (q) => q.eq("userId", args.userId).eq("sessionId", args.sessionId))
      .first();

    if (existing) {
      const updatedInteractions = [...(existing.interactions || []), ...args.interactions];
      
      // Keep only the last 100 interactions for performance
      const trimmedInteractions = updatedInteractions.slice(-100);
      
      await ctx.db.patch(existing._id, {
        interactions: trimmedInteractions,
        lastSaved: Date.now(),
      });
    }
  },
});

// Add structure to viewer session
export const addStructure = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    userId: v.string(),
    structure: v.object({
      id: v.string(),
      url: v.string(),
      name: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found or unauthorized");
    }

    const existing = await ctx.db
      .query("viewerSessions")
      .withIndex("by_user_session", (q) => q.eq("userId", args.userId).eq("sessionId", args.sessionId))
      .first();

    const structureWithTimestamp = {
      ...args.structure,
      loadedAt: Date.now(),
    };

    if (existing) {
      // Check if structure already exists
      const structureExists = existing.viewerState.structures.some(s => s.id === args.structure.id);
      
      if (!structureExists) {
        const updatedStructures = [...existing.viewerState.structures, structureWithTimestamp];
        
        await ctx.db.patch(existing._id, {
          viewerState: {
            ...existing.viewerState,
            structures: updatedStructures,
          },
          lastSaved: Date.now(),
        });
      }
    } else {
      // Create new viewer session with structure
      await ctx.db.insert("viewerSessions", {
        userId: args.userId,
        sessionId: args.sessionId,
        viewerState: {
          structures: [structureWithTimestamp],
          camera: undefined,
          representations: [],
          selections: [],
          measurements: [],
          annotations: [],
          viewingMode: "default",
          visualization: {
            lighting: undefined,
            quality: "medium",
            transparency: 0.5,
          },
        },
        interactions: [],
        lastSaved: Date.now(),
        autoSaveEnabled: true,
      });
    }
  },
});

// Remove structure from viewer session
export const removeStructure = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    userId: v.string(),
    structureId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found or unauthorized");
    }

    const existing = await ctx.db
      .query("viewerSessions")
      .withIndex("by_user_session", (q) => q.eq("userId", args.userId).eq("sessionId", args.sessionId))
      .first();

    if (existing) {
      const updatedStructures = existing.viewerState.structures.filter(s => s.id !== args.structureId);
      
      await ctx.db.patch(existing._id, {
        viewerState: {
          ...existing.viewerState,
          structures: updatedStructures,
        },
        lastSaved: Date.now(),
      });
    }
  },
});

// Update camera position
export const updateCamera = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    userId: v.string(),
    camera: v.any(),
  },
  handler: async (ctx, args) => {
    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found or unauthorized");
    }

    const existing = await ctx.db
      .query("viewerSessions")
      .withIndex("by_user_session", (q) => q.eq("userId", args.userId).eq("sessionId", args.sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        viewerState: {
          ...existing.viewerState,
          camera: args.camera,
        },
        lastSaved: Date.now(),
      });
    }
  },
});

// Update representations
export const updateRepresentations = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    userId: v.string(),
    representations: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found or unauthorized");
    }

    const existing = await ctx.db
      .query("viewerSessions")
      .withIndex("by_user_session", (q) => q.eq("userId", args.userId).eq("sessionId", args.sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        viewerState: {
          ...existing.viewerState,
          representations: args.representations,
        },
        lastSaved: Date.now(),
      });
    }
  },
});

// Update selections
export const updateSelections = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    userId: v.string(),
    selections: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found or unauthorized");
    }

    const existing = await ctx.db
      .query("viewerSessions")
      .withIndex("by_user_session", (q) => q.eq("userId", args.userId).eq("sessionId", args.sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        viewerState: {
          ...existing.viewerState,
          selections: args.selections,
        },
        lastSaved: Date.now(),
      });
    }
  },
});

// Get all viewer sessions for a user
export const getUserViewerSessions = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("viewerSessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc");

    if (args.limit) {
      return await query.take(args.limit);
    }

    return await query.collect();
  },
});

// Clear viewer session
export const clearViewerSession = mutation({
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

    const existing = await ctx.db
      .query("viewerSessions")
      .withIndex("by_user_session", (q) => q.eq("userId", args.userId).eq("sessionId", args.sessionId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// Batch update viewer state for efficiency
export const batchUpdateViewerState = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    userId: v.string(),
    updates: v.object({
      structures: v.optional(v.array(v.object({
        id: v.string(),
        url: v.string(),
        name: v.string(),
        loadedAt: v.number(),
      }))),
      camera: v.optional(v.any()),
      representations: v.optional(v.array(v.any())),
      selections: v.optional(v.array(v.any())),
      measurements: v.optional(v.array(v.any())),
      annotations: v.optional(v.array(v.any())),
      viewingMode: v.optional(v.string()),
      visualization: v.optional(v.object({
        lighting: v.optional(v.any()),
        quality: v.optional(v.string()),
        transparency: v.optional(v.number()),
      })),
    }),
    interactions: v.optional(v.array(v.object({
      type: v.string(),
      timestamp: v.number(),
      data: v.any(),
    }))),
  },
  handler: async (ctx, args) => {
    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) {
      throw new Error("Session not found or unauthorized");
    }

    const existing = await ctx.db
      .query("viewerSessions")
      .withIndex("by_user_session", (q) => q.eq("userId", args.userId).eq("sessionId", args.sessionId))
      .first();

    const now = Date.now();

    if (existing) {
      // Merge updates with existing state
      const updatedViewerState = {
        structures: args.updates.structures || existing.viewerState.structures,
        camera: args.updates.camera !== undefined ? args.updates.camera : existing.viewerState.camera,
        representations: args.updates.representations || existing.viewerState.representations,
        selections: args.updates.selections || existing.viewerState.selections,
        measurements: args.updates.measurements || existing.viewerState.measurements,
        annotations: args.updates.annotations || existing.viewerState.annotations,
        viewingMode: args.updates.viewingMode || existing.viewerState.viewingMode,
        visualization: args.updates.visualization || existing.viewerState.visualization,
      };

      const updatedInteractions = args.interactions 
        ? [...(existing.interactions || []), ...args.interactions].slice(-100)
        : existing.interactions;

      await ctx.db.patch(existing._id, {
        viewerState: updatedViewerState,
        interactions: updatedInteractions,
        lastSaved: now,
      });
    } else {
      // Create new viewer session
      await ctx.db.insert("viewerSessions", {
        userId: args.userId,
        sessionId: args.sessionId,
        viewerState: {
          structures: args.updates.structures || [],
          camera: args.updates.camera,
          representations: args.updates.representations || [],
          selections: args.updates.selections || [],
          measurements: args.updates.measurements || [],
          annotations: args.updates.annotations || [],
          viewingMode: args.updates.viewingMode || "default",
          visualization: args.updates.visualization || {
            lighting: undefined,
            quality: "medium",
            transparency: 0.5,
          },
        },
        interactions: args.interactions || [],
        lastSaved: now,
        autoSaveEnabled: true,
      });
    }
  },
});