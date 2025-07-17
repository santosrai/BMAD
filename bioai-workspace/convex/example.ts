import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const deleteUserByEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // Delete from users table
    const users = await ctx.db.query("users").filter(q => q.eq(q.field("email"), args.email)).collect();
    for (const user of users) {
      await ctx.db.delete(user._id);
    }
    // Delete from authAccounts table
    const accounts = await ctx.db.query("authAccounts").filter(q => q.eq(q.field("providerAccountId"), args.email)).collect();
    for (const account of accounts) {
      await ctx.db.delete(account._id);
    }
    return { deletedUsers: users.length, deletedAccounts: accounts.length };
  },
});

