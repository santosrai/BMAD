import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const current = query({
  args: {},
  handler: async () => {
    // For now, return null since we're using Clerk for auth
    // This can be updated later if you need to sync Clerk user data to Convex
    return null;
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async () => {
    // Profile updates are now handled by Clerk
    // This function can be used for additional user data if needed
    throw new Error("Profile updates are handled by Clerk");
  },
});

export const getProfile = query({
  args: {},
  handler: async () => {
    // Profile data is now handled by Clerk
    // This function can be used for additional user data if needed
    return null;
  },
});