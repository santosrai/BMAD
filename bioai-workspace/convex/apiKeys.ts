import { mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { v } from "convex/values";

// Get user's API key information
export const getApiKey = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      return null;
    }
    
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    // Return API key info (masked for security)
    return {
      hasApiKey: !!user.openrouterApiKey,
      maskedApiKey: user.openrouterApiKey ? 
        `****${user.openrouterApiKey.slice(-4)}` : null,
      status: user.apiKeyStatus || 'untested',
      lastValidated: user.apiKeyLastValidated,
      errorMessage: user.apiKeyErrorMessage,
    };
  },
});

// Set or update user's API key
export const setApiKey = mutation({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      throw new Error("User must be authenticated");
    }

    // Basic validation
    if (!args.apiKey || args.apiKey.trim().length === 0) {
      throw new Error("API key cannot be empty");
    }

    // Store the API key with initial status
    await ctx.db.patch(userId, {
      openrouterApiKey: args.apiKey.trim(),
      apiKeyStatus: 'untested',
      apiKeyLastValidated: undefined,
      apiKeyErrorMessage: undefined,
    });

    return { success: true };
  },
});

// Update API key validation status
export const updateApiKeyStatus = mutation({
  args: {
    status: v.string(), // 'valid' | 'invalid' | 'untested'
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      throw new Error("User must be authenticated");
    }

    const updates: Record<string, unknown> = {
      apiKeyStatus: args.status,
      apiKeyLastValidated: Date.now(),
    };

    if (args.errorMessage !== undefined) {
      updates.apiKeyErrorMessage = args.errorMessage;
    } else {
      updates.apiKeyErrorMessage = undefined;
    }

    await ctx.db.patch(userId, updates);
    return { success: true };
  },
});

// Remove user's API key
export const removeApiKey = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      throw new Error("User must be authenticated");
    }

    await ctx.db.patch(userId, {
      openrouterApiKey: undefined,
      apiKeyStatus: undefined,
      apiKeyLastValidated: undefined,
      apiKeyErrorMessage: undefined,
    });

    return { success: true };
  },
});

// Get the actual API key for service use (server-side only)
export const getApiKeyForService = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      return null;
    }
    
    const user = await ctx.db.get(userId);
    if (!user || !user.openrouterApiKey) {
      return null;
    }

    return {
      apiKey: user.openrouterApiKey,
      status: user.apiKeyStatus,
    };
  },
});