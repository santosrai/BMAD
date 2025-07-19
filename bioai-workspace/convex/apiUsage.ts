import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// API Usage schema
export const updateUsage = mutation({
  args: {
    userId: v.string(),
    service: v.string(), // 'openrouter', 'openai', etc.
    model: v.string(),
    tokens: v.number(),
    cost: v.number(),
    requestType: v.string(), // 'chat', 'streaming', 'completion'
  },
  handler: async (ctx, args) => {
    // Get or create user usage record
    const existingUsage = await ctx.db
      .query('apiUsage')
      .filter(q => q.eq(q.field('userId'), args.userId))
      .first();

    if (existingUsage) {
      // Update existing usage
      await ctx.db.patch(existingUsage._id, {
        totalTokens: existingUsage.totalTokens + args.tokens,
        totalCost: existingUsage.totalCost + args.cost,
        requestCount: existingUsage.requestCount + 1,
        lastUsedAt: Date.now(),
        // Add to request history
        requests: [
          ...existingUsage.requests.slice(-99), // Keep last 100 requests
          {
            service: args.service,
            model: args.model,
            tokens: args.tokens,
            cost: args.cost,
            requestType: args.requestType,
            timestamp: Date.now()
          }
        ]
      });
    } else {
      // Create new usage record
      await ctx.db.insert('apiUsage', {
        userId: args.userId,
        totalTokens: args.tokens,
        totalCost: args.cost,
        requestCount: 1,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        requests: [{
          service: args.service,
          model: args.model,
          tokens: args.tokens,
          cost: args.cost,
          requestType: args.requestType,
          timestamp: Date.now()
        }]
      });
    }
  }
});

// Get user usage statistics
export const getUserUsage = query({
  args: {
    userId: v.string()
  },
  handler: async (ctx, args) => {
    const usage = await ctx.db
      .query('apiUsage')
      .filter(q => q.eq(q.field('userId'), args.userId))
      .first();

    if (!usage) {
      return {
        totalTokens: 0,
        totalCost: 0,
        requestCount: 0,
        requests: []
      };
    }

    return {
      totalTokens: usage.totalTokens,
      totalCost: usage.totalCost,
      requestCount: usage.requestCount,
      requests: usage.requests || [],
      createdAt: usage.createdAt,
      lastUsedAt: usage.lastUsedAt
    };
  }
});

// Get usage statistics for a specific time period
export const getUsageByPeriod = query({
  args: {
    userId: v.string(),
    startDate: v.number(),
    endDate: v.number()
  },
  handler: async (ctx, args) => {
    const usage = await ctx.db
      .query('apiUsage')
      .filter(q => q.eq(q.field('userId'), args.userId))
      .first();

    if (!usage || !usage.requests) {
      return {
        totalTokens: 0,
        totalCost: 0,
        requestCount: 0,
        requests: []
      };
    }

    const periodRequests = usage.requests.filter(req => 
      req.timestamp >= args.startDate && req.timestamp <= args.endDate
    );

    const totalTokens = periodRequests.reduce((sum, req) => sum + req.tokens, 0);
    const totalCost = periodRequests.reduce((sum, req) => sum + req.cost, 0);

    return {
      totalTokens,
      totalCost,
      requestCount: periodRequests.length,
      requests: periodRequests
    };
  }
});

// Get usage by service/model
export const getUsageBreakdown = query({
  args: {
    userId: v.string()
  },
  handler: async (ctx, args) => {
    const usage = await ctx.db
      .query('apiUsage')
      .filter(q => q.eq(q.field('userId'), args.userId))
      .first();

    if (!usage || !usage.requests) {
      return {
        byService: {},
        byModel: {},
        byRequestType: {}
      };
    }

    const breakdown = usage.requests.reduce((acc, req) => {
      // By service
      if (!acc.byService[req.service]) {
        acc.byService[req.service] = { tokens: 0, cost: 0, requests: 0 };
      }
      acc.byService[req.service].tokens += req.tokens;
      acc.byService[req.service].cost += req.cost;
      acc.byService[req.service].requests += 1;

      // By model
      if (!acc.byModel[req.model]) {
        acc.byModel[req.model] = { tokens: 0, cost: 0, requests: 0 };
      }
      acc.byModel[req.model].tokens += req.tokens;
      acc.byModel[req.model].cost += req.cost;
      acc.byModel[req.model].requests += 1;

      // By request type
      if (!acc.byRequestType[req.requestType]) {
        acc.byRequestType[req.requestType] = { tokens: 0, cost: 0, requests: 0 };
      }
      acc.byRequestType[req.requestType].tokens += req.tokens;
      acc.byRequestType[req.requestType].cost += req.cost;
      acc.byRequestType[req.requestType].requests += 1;

      return acc;
    }, {
      byService: {} as Record<string, { tokens: number; cost: number; requests: number }>,
      byModel: {} as Record<string, { tokens: number; cost: number; requests: number }>,
      byRequestType: {} as Record<string, { tokens: number; cost: number; requests: number }>
    });

    return breakdown;
  }
});

// Clear usage data for a user
export const clearUsage = mutation({
  args: {
    userId: v.string()
  },
  handler: async (ctx, args) => {
    const usage = await ctx.db
      .query('apiUsage')
      .filter(q => q.eq(q.field('userId'), args.userId))
      .first();

    if (usage) {
      await ctx.db.patch(usage._id, {
        totalTokens: 0,
        totalCost: 0,
        requestCount: 0,
        requests: []
      });
    }
  }
});

// Set usage alerts and limits
export const setUsageAlerts = mutation({
  args: {
    userId: v.string(),
    costLimit: v.optional(v.number()),
    tokenLimit: v.optional(v.number()),
    requestLimit: v.optional(v.number()),
    alertThreshold: v.optional(v.number()) // Percentage (0-100)
  },
  handler: async (ctx, args) => {
    // Get or create user usage record
    const existingUsage = await ctx.db
      .query('apiUsage')
      .filter(q => q.eq(q.field('userId'), args.userId))
      .first();

    const alertSettings = {
      costLimit: args.costLimit,
      tokenLimit: args.tokenLimit,
      requestLimit: args.requestLimit,
      alertThreshold: args.alertThreshold || 80
    };

    if (existingUsage) {
      await ctx.db.patch(existingUsage._id, {
        alertSettings
      });
    } else {
      await ctx.db.insert('apiUsage', {
        userId: args.userId,
        totalTokens: 0,
        totalCost: 0,
        requestCount: 0,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        requests: [],
        alertSettings
      });
    }
  }
});

// Check if user has exceeded usage limits
export const checkUsageLimits = query({
  args: {
    userId: v.string()
  },
  handler: async (ctx, args) => {
    const usage = await ctx.db
      .query('apiUsage')
      .filter(q => q.eq(q.field('userId'), args.userId))
      .first();

    if (!usage || !usage.alertSettings) {
      return {
        withinLimits: true,
        alerts: []
      };
    }

    const alerts = [];
    const { alertSettings } = usage;
    const alertThreshold = alertSettings.alertThreshold / 100;

    // Check cost limit
    if (alertSettings.costLimit) {
      if (usage.totalCost >= alertSettings.costLimit) {
        alerts.push({
          type: 'cost',
          message: `Cost limit exceeded: $${usage.totalCost.toFixed(4)} / $${alertSettings.costLimit}`,
          severity: 'error'
        });
      } else if (usage.totalCost >= alertSettings.costLimit * alertThreshold) {
        alerts.push({
          type: 'cost',
          message: `Cost approaching limit: $${usage.totalCost.toFixed(4)} / $${alertSettings.costLimit}`,
          severity: 'warning'
        });
      }
    }

    // Check token limit
    if (alertSettings.tokenLimit) {
      if (usage.totalTokens >= alertSettings.tokenLimit) {
        alerts.push({
          type: 'tokens',
          message: `Token limit exceeded: ${usage.totalTokens} / ${alertSettings.tokenLimit}`,
          severity: 'error'
        });
      } else if (usage.totalTokens >= alertSettings.tokenLimit * alertThreshold) {
        alerts.push({
          type: 'tokens',
          message: `Tokens approaching limit: ${usage.totalTokens} / ${alertSettings.tokenLimit}`,
          severity: 'warning'
        });
      }
    }

    // Check request limit
    if (alertSettings.requestLimit) {
      if (usage.requestCount >= alertSettings.requestLimit) {
        alerts.push({
          type: 'requests',
          message: `Request limit exceeded: ${usage.requestCount} / ${alertSettings.requestLimit}`,
          severity: 'error'
        });
      } else if (usage.requestCount >= alertSettings.requestLimit * alertThreshold) {
        alerts.push({
          type: 'requests',
          message: `Requests approaching limit: ${usage.requestCount} / ${alertSettings.requestLimit}`,
          severity: 'warning'
        });
      }
    }

    return {
      withinLimits: alerts.every(alert => alert.severity !== 'error'),
      alerts
    };
  }
});