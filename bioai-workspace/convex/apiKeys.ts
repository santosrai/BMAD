import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get user's API key information
export const getApiKey = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userId))
      .first();

    if (!user) {
      return {
        hasApiKey: false,
        status: 'untested',
        lastValidated: null,
        errorMessage: null,
      };
    }

    return {
      hasApiKey: !!user.openrouterApiKey,
      status: user.apiKeyStatus || 'untested',
      lastValidated: user.apiKeyLastValidated,
      errorMessage: user.apiKeyErrorMessage,
    };
  },
});

// Set or update user's API key
export const setApiKey = mutation({
  args: {
    userId: v.string(),
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userId))
      .first();

    if (!user) {
      // Create user if doesn't exist
      const now = Math.floor(Date.now());
      await ctx.db.insert("users", {
        email: args.userId,
        openrouterApiKey: args.apiKey,
        apiKeyStatus: 'untested',
        apiKeyLastValidated: now,
      });
    } else {
      // Update existing user
      await ctx.db.patch(user._id, {
        openrouterApiKey: args.apiKey,
        apiKeyStatus: 'untested',
        apiKeyLastValidated: Math.floor(Date.now()),
        apiKeyErrorMessage: undefined,
      });
    }
  },
});

// Update API key validation status
export const updateApiKeyStatus = mutation({
  args: {
    userId: v.string(),
    status: v.union(v.literal("valid"), v.literal("invalid"), v.literal("untested")),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      apiKeyStatus: args.status,
      apiKeyLastValidated: Math.floor(Date.now()),
      apiKeyErrorMessage: args.errorMessage,
    });
  },
});

// Remove user's API key
export const removeApiKey = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      openrouterApiKey: undefined,
      apiKeyStatus: 'untested',
      apiKeyErrorMessage: undefined,
    });
  },
});


// Get the actual API key for service use (server-side only)
export const getApiKeyForService = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userId))
      .first();

    if (!user || !user.openrouterApiKey) {
      return null;
    }

    return user.openrouterApiKey;
  },
});