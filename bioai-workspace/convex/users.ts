import { mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { v } from "convex/values";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      throw new Error("User must be authenticated");
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.email !== undefined) {
      updates.email = args.email;
    }

    await ctx.db.patch(userId, updates);
    return await ctx.db.get(userId);
  },
});

export const getProfile = query({
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

    // Return user profile data (excluding sensitive information)
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      _creationTime: user._creationTime,
    };
  },
});