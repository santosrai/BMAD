import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// PDB history entry type
// { userId: string, identifier: string, title: string, organism?: string, resolution?: number, experimentalMethod?: string, ts: number }

export const getPDBHistory = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query('pdb_history')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .order('desc')
      .take(10);
    return history;
  },
});

export const addPDBToHistory = mutation({
  args: {
    userId: v.string(),
    identifier: v.string(),
    title: v.string(),
    organism: v.optional(v.string()),
    resolution: v.optional(v.float64()),
    experimentalMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Remove any existing entry for this PDB/user
    const existing = await ctx.db
      .query('pdb_history')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .filter(q => q.eq(q.field('identifier'), args.identifier))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    // Insert new entry at the top
    await ctx.db.insert('pdb_history', {
      ...args,
      ts: Date.now(),
    });
    // Keep only 10 most recent
    const all = await ctx.db
      .query('pdb_history')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .order('desc')
      .collect();
    if (all.length > 10) {
      for (const entry of all.slice(10)) {
        await ctx.db.delete(entry._id);
      }
    }
  },
});

export const clearPDBHistory = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query('pdb_history')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect();
    for (const entry of all) {
      await ctx.db.delete(entry._id);
    }
  },
}); 