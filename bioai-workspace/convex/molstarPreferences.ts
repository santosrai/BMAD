import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getUserPreferences = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const preferences = await ctx.db
      .query("molstarPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    if (!preferences) {
      // Return default preferences if none exist
      return {
        preferences: {
          performanceMode: "auto" as const,
          autoRotate: false,
          showAxes: true,
          backgroundColor: "#ffffff",
          representationStyle: "cartoon" as const,
        },
        recentStructures: [],
        lastSession: null,
        updatedAt: Date.now(),
      };
    }
    
    return preferences;
  },
});

export const updatePreferences = mutation({
  args: {
    userId: v.string(),
    preferences: v.object({
      performanceMode: v.union(v.literal("auto"), v.literal("high"), v.literal("medium"), v.literal("low")),
      autoRotate: v.boolean(),
      showAxes: v.boolean(),
      backgroundColor: v.string(),
      representationStyle: v.union(v.literal("cartoon"), v.literal("surface"), v.literal("ball-and-stick"), v.literal("spacefill")),
    }),
    recentStructures: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("molstarPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    const now = Date.now();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        preferences: args.preferences,
        recentStructures: args.recentStructures || existing.recentStructures,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("molstarPreferences", {
        userId: args.userId,
        preferences: args.preferences,
        recentStructures: args.recentStructures || [],
        updatedAt: now,
      });
    }
  },
});

export const saveSession = mutation({
  args: {
    userId: v.string(),
    sessionState: v.any(),
    structureUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("molstarPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    const now = Date.now();
    const sessionData = {
      structureUrl: args.structureUrl,
      camera: args.sessionState.camera,
      representations: args.sessionState.representations || [],
      selections: args.sessionState.selections || [],
    };
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        lastSession: sessionData,
        updatedAt: now,
      });
    } else {
      // Create new preferences with default values
      await ctx.db.insert("molstarPreferences", {
        userId: args.userId,
        preferences: {
          performanceMode: "auto",
          autoRotate: false,
          showAxes: true,
          backgroundColor: "#ffffff",
          representationStyle: "cartoon",
        },
        recentStructures: [],
        lastSession: sessionData,
        updatedAt: now,
      });
    }
  },
});

export const addRecentStructure = mutation({
  args: {
    userId: v.string(),
    structureUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("molstarPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    const now = Date.now();
    
    if (existing) {
      const currentRecent = existing.recentStructures || [];
      const filtered = currentRecent.filter(url => url !== args.structureUrl);
      const newRecent = [args.structureUrl, ...filtered].slice(0, 10);
      
      await ctx.db.patch(existing._id, {
        recentStructures: newRecent,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("molstarPreferences", {
        userId: args.userId,
        preferences: {
          performanceMode: "auto",
          autoRotate: false,
          showAxes: true,
          backgroundColor: "#ffffff",
          representationStyle: "cartoon",
        },
        recentStructures: [args.structureUrl],
        updatedAt: now,
      });
    }
  },
});

export const clearRecentStructures = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("molstarPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        recentStructures: [],
        updatedAt: Date.now(),
      });
    }
  },
});

export const getRecentStructures = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const preferences = await ctx.db
      .query("molstarPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    if (!preferences) {
      return [];
    }
    
    const recent = preferences.recentStructures || [];
    return args.limit ? recent.slice(0, args.limit) : recent;
  },
});