import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const createExportJob = mutation({
  args: {
    userId: v.string(),
    type: v.union(v.literal("pdb"), v.literal("image"), v.literal("conversation"), v.literal("batch")),
    filename: v.string(),
    options: v.object({
      format: v.object({
        name: v.string(),
        extension: v.string(),
        mimeType: v.string(),
        description: v.string(),
      }),
      quality: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("ultra"))),
      includeMetadata: v.optional(v.boolean()),
      includeTimestamps: v.optional(v.boolean()),
      customFilename: v.optional(v.string()),
    }),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed"), v.literal("cancelled")),
    progress: v.number(),
    fileSize: v.optional(v.number()),
    downloadUrl: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const exportJob = await ctx.db.insert("exports", {
      userId: args.userId,
      type: args.type,
      filename: args.filename,
      options: args.options,
      status: args.status,
      progress: args.progress,
      fileSize: args.fileSize,
      downloadUrl: args.downloadUrl,
      error: args.error,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return exportJob;
  },
});

export const updateExportJob = mutation({
  args: {
    exportId: v.id("exports"),
    status: v.optional(v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed"), v.literal("cancelled"))),
    progress: v.optional(v.number()),
    fileSize: v.optional(v.number()),
    downloadUrl: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { exportId, ...updates } = args;
    
    await ctx.db.patch(exportId, {
      ...updates,
      updatedAt: Date.now(),
      ...(updates.status === "completed" && { completedAt: Date.now() }),
    });

    return exportId;
  },
});

export const getExportJob = query({
  args: { exportId: v.id("exports") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.exportId);
  },
});

export const getUserExports = query({
  args: { 
    userId: v.string(),
    limit: v.optional(v.number()),
    status: v.optional(v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed"), v.literal("cancelled"))),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("exports")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .order("desc");

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    if (args.limit) {
      query = query.take(args.limit);
    }

    return await query.collect();
  },
});

export const getActiveExports = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("exports")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.or(
        q.eq(q.field("status"), "pending"),
        q.eq(q.field("status"), "processing")
      ))
      .order("desc")
      .collect();
  },
});

export const getExportHistory = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const exports = await ctx.db
      .query("exports")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .order("desc")
      .collect();

    const totalExports = exports.length;
    const totalSize = exports.reduce((sum, exp) => sum + (exp.fileSize || 0), 0);
    const lastExport = exports[0];

    return {
      userId: args.userId,
      exports,
      totalExports,
      totalSize,
      lastExportAt: lastExport?.createdAt || null,
    };
  },
});

export const deleteExportJob = mutation({
  args: { exportId: v.id("exports") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.exportId);
    return args.exportId;
  },
});

export const cleanupOldExports = mutation({
  args: { 
    userId: v.string(),
    daysOld: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoffDate = Date.now() - (args.daysOld * 24 * 60 * 60 * 1000);
    
    const oldExports = await ctx.db
      .query("exports")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.lt(q.field("createdAt"), cutoffDate))
      .collect();

    for (const exportJob of oldExports) {
      await ctx.db.delete(exportJob._id);
    }

    return oldExports.length;
  },
});

export const getExportStats = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const exports = await ctx.db
      .query("exports")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    const stats = {
      total: exports.length,
      completed: exports.filter(e => e.status === "completed").length,
      failed: exports.filter(e => e.status === "failed").length,
      pending: exports.filter(e => e.status === "pending").length,
      processing: exports.filter(e => e.status === "processing").length,
      totalSize: exports.reduce((sum, exp) => sum + (exp.fileSize || 0), 0),
      byType: {
        pdb: exports.filter(e => e.type === "pdb").length,
        image: exports.filter(e => e.type === "image").length,
        conversation: exports.filter(e => e.type === "conversation").length,
        batch: exports.filter(e => e.type === "batch").length,
      },
    };

    return stats;
  },
});

export const createExportTemplate = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    description: v.string(),
    type: v.union(v.literal("pdb"), v.literal("image"), v.literal("conversation")),
    defaultSettings: v.object({
      format: v.object({
        name: v.string(),
        extension: v.string(),
        mimeType: v.string(),
        description: v.string(),
      }),
      quality: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("ultra"))),
      includeMetadata: v.optional(v.boolean()),
      includeTimestamps: v.optional(v.boolean()),
    }),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.insert("exportTemplates", {
      userId: args.userId,
      name: args.name,
      description: args.description,
      type: args.type,
      defaultSettings: args.defaultSettings,
      isDefault: args.isDefault || false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return template;
  },
});

export const getUserExportTemplates = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("exportTemplates")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .order("desc")
      .collect();
  },
});

export const getExportTemplate = query({
  args: { templateId: v.id("exportTemplates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.templateId);
  },
});

export const updateExportTemplate = mutation({
  args: {
    templateId: v.id("exportTemplates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    defaultSettings: v.optional(v.object({
      format: v.object({
        name: v.string(),
        extension: v.string(),
        mimeType: v.string(),
        description: v.string(),
      }),
      quality: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("ultra"))),
      includeMetadata: v.optional(v.boolean()),
      includeTimestamps: v.optional(v.boolean()),
    })),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { templateId, ...updates } = args;
    
    await ctx.db.patch(templateId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return templateId;
  },
});

export const deleteExportTemplate = mutation({
  args: { templateId: v.id("exportTemplates") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.templateId);
    return args.templateId;
  },
});

export const getDefaultExportTemplates = query({
  args: { type: v.optional(v.union(v.literal("pdb"), v.literal("image"), v.literal("conversation"))) },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("exportTemplates")
      .filter((q) => q.eq(q.field("isDefault"), true));

    if (args.type) {
      query = query.filter((q) => q.eq(q.field("type"), args.type));
    }

    return await query.collect();
  },
});