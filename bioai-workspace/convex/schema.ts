import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    email: v.string(),
    emailVerified: v.optional(v.boolean()),
    _creationTime: v.number(),
    // API Key management fields
    openrouterApiKey: v.optional(v.string()),
    apiKeyStatus: v.optional(v.string()), // 'valid' | 'invalid' | 'untested'
    apiKeyLastValidated: v.optional(v.number()),
    apiKeyErrorMessage: v.optional(v.string()),
  }).index("by_email", ["email"]),
  
  // Required tables for @convex-dev/auth
  authAccounts: defineTable({
    userId: v.id("users"),
    provider: v.string(),
    providerAccountId: v.string(),
    secret: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    tokenType: v.optional(v.string()),
    scope: v.optional(v.string()),
    idToken: v.optional(v.string()),
    sessionState: v.optional(v.string()),
  })
    .index("providerAndAccountId", ["provider", "providerAccountId"])
    .index("by_user_id", ["userId"]),
    
  authSessions: defineTable({
    userId: v.id("users"),
    sessionToken: v.optional(v.string()),
    expires: v.optional(v.number()),
    expirationTime: v.optional(v.number()),
  })
    .index("by_session_token", ["sessionToken"])
    .index("by_user_id", ["userId"]),
    
  authVerificationTokens: defineTable({
    identifier: v.string(),
    token: v.string(),
    expires: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_identifier", ["identifier"]),
}); 