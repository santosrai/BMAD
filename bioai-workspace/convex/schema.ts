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

  chatSessions: defineTable({
    userId: v.string(),
    title: v.string(),
    createdAt: v.float64(),
    updatedAt: v.float64(),
    messageCount: v.number(),
    isActive: v.boolean(),
    // Enhanced session metadata
    tags: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    lastAccessedAt: v.optional(v.float64()),
    autoSaveEnabled: v.optional(v.boolean()),
    // AI context preservation
    aiWorkflowState: v.optional(v.object({
      currentWorkflow: v.optional(v.string()),
      workflowHistory: v.optional(v.array(v.any())),
      conversationMemory: v.optional(v.any()),
      toolStates: v.optional(v.any()),
    })),
    // Session settings
    settings: v.optional(v.object({
      autoSave: v.boolean(),
      notificationsEnabled: v.boolean(),
      theme: v.optional(v.string()),
    })),
  }).index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"])
    .index("by_user_last_accessed", ["userId", "lastAccessedAt"]),

  chatMessages: defineTable({
    sessionId: v.id("chatSessions"),
    userId: v.string(),
    content: v.string(),
    timestamp: v.number(),
    type: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    status: v.union(v.literal("sending"), v.literal("sent"), v.literal("error")),
    metadata: v.optional(v.object({
      error: v.optional(v.string()),
      processingTime: v.optional(v.number()),
      tokenCount: v.optional(v.number()),
      // AI workflow related fields
      workflowId: v.optional(v.string()),
      tokensUsed: v.optional(v.number()),
      toolsInvoked: v.optional(v.array(v.string())),
      confidence: v.optional(v.number()),
      sources: v.optional(v.array(v.string())),
      suggestedFollowUps: v.optional(v.array(v.string())),
      fallback: v.optional(v.boolean()),
    })),
  }).index("by_session", ["sessionId"])
    .index("by_session_timestamp", ["sessionId", "timestamp"])
    .index("by_user", ["userId"]),

  molstarPreferences: defineTable({
    userId: v.string(),
    preferences: v.object({
      performanceMode: v.union(v.literal("auto"), v.literal("high"), v.literal("medium"), v.literal("low")),
      autoRotate: v.boolean(),
      showAxes: v.boolean(),
      backgroundColor: v.string(),
      representationStyle: v.union(v.literal("cartoon"), v.literal("surface"), v.literal("ball-and-stick"), v.literal("spacefill")),
    }),
    recentStructures: v.optional(v.array(v.string())),
    lastSession: v.optional(v.object({
      structureUrl: v.optional(v.string()),
      camera: v.optional(v.any()),
      representations: v.optional(v.array(v.any())),
      selections: v.optional(v.array(v.any())),
    })),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Enhanced viewer state for comprehensive session persistence
  viewerSessions: defineTable({
    userId: v.string(),
    sessionId: v.id("chatSessions"),
    viewerState: v.object({
      structures: v.array(v.object({
        id: v.string(),
        url: v.string(),
        name: v.string(),
        loadedAt: v.number(),
      })),
      camera: v.optional(v.any()),
      representations: v.array(v.any()),
      selections: v.array(v.any()),
      measurements: v.optional(v.array(v.any())),
      annotations: v.optional(v.array(v.any())),
      viewingMode: v.string(),
      visualization: v.object({
        lighting: v.optional(v.any()),
        quality: v.optional(v.string()),
        transparency: v.optional(v.number()),
      }),
    }),
    interactions: v.optional(v.array(v.object({
      type: v.string(),
      timestamp: v.number(),
      data: v.any(),
    }))),
    lastSaved: v.number(),
    autoSaveEnabled: v.boolean(),
  }).index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_user_session", ["userId", "sessionId"]),

  pdb_history: defineTable({
    userId: v.string(),
    identifier: v.string(),
    title: v.string(),
    organism: v.optional(v.string()),
    resolution: v.optional(v.float64()),
    experimentalMethod: v.optional(v.string()),
    ts: v.number(),
  }).index("by_user", ["userId"]),

  // Session snapshots for versioning and backup
  sessionSnapshots: defineTable({
    userId: v.string(),
    sessionId: v.id("chatSessions"),
    snapshotType: v.union(v.literal("auto"), v.literal("manual"), v.literal("checkpoint")),
    timestamp: v.number(),
    data: v.object({
      chatState: v.object({
        messages: v.array(v.any()),
        messageCount: v.number(),
        sessionTitle: v.string(),
      }),
      viewerState: v.optional(v.any()),
      aiWorkflowState: v.optional(v.any()),
      userInteractions: v.optional(v.array(v.any())),
    }),
    metadata: v.optional(v.object({
      size: v.number(),
      checksum: v.optional(v.string()),
      description: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
    })),
    isRecoverable: v.boolean(),
    expiresAt: v.optional(v.number()),
  }).index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_user_timestamp", ["userId", "timestamp"])
    .index("by_session_timestamp", ["sessionId", "timestamp"]),

  // Offline sync queue for handling offline state changes
  offlineSyncQueue: defineTable({
    userId: v.string(),
    sessionId: v.optional(v.id("chatSessions")),
    operation: v.object({
      type: v.string(),
      target: v.string(),
      data: v.any(),
      timestamp: v.number(),
    }),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
    retryCount: v.number(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    createdAt: v.number(),
    lastAttempt: v.optional(v.number()),
    error: v.optional(v.string()),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_user_status", ["userId", "status"])
    .index("by_priority", ["priority"]),

  // AI Workflow Management Tables
  aiWorkflows: defineTable({
    workflowId: v.string(),
    userId: v.string(),
    sessionId: v.string(),
    workflowType: v.string(),
    status: v.union(v.literal("running"), v.literal("completed"), v.literal("failed"), v.literal("cancelled"), v.literal("paused")),
    progress: v.number(),
    currentStep: v.string(),
    totalSteps: v.number(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    estimatedCompletion: v.optional(v.number()),
    metadata: v.object({
      version: v.string(),
      performance: v.object({
        totalTokens: v.number(),
        totalDuration: v.number(),
        apiCalls: v.number(),
        cacheHits: v.number(),
      }),
    }),
  }).index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_workflow_id", ["workflowId"])
    .index("by_status", ["status"]),

  workflowResults: defineTable({
    workflowId: v.string(),
    userId: v.string(),
    sessionId: v.string(),
    result: v.object({
      response: v.string(),
      actions: v.array(v.object({
        id: v.string(),
        type: v.string(),
        description: v.string(),
        result: v.any(),
        timestamp: v.number(),
        duration: v.number(),
        success: v.boolean(),
        metadata: v.any(),
      })),
      newContext: v.any(),
      suggestedFollowUps: v.array(v.string()),
      metadata: v.object({
        tokensUsed: v.number(),
        duration: v.number(),
        toolsInvoked: v.array(v.string()),
        confidence: v.number(),
        sources: v.array(v.string()),
      }),
      status: v.union(v.literal("completed"), v.literal("partial"), v.literal("failed"), v.literal("requires_input")),
    }),
    createdAt: v.number(),
  }).index("by_workflow_id", ["workflowId"])
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"]),

  workflowHistory: defineTable({
    userId: v.string(),
    sessionId: v.string(),
    workflowId: v.string(),
    userMessage: v.string(),
    aiResponse: v.string(),
    actions: v.array(v.object({
      id: v.string(),
      type: v.string(),
      description: v.string(),
      result: v.any(),
      timestamp: v.number(),
      duration: v.number(),
      success: v.boolean(),
      metadata: v.any(),
    })),
    context: v.any(),
    metadata: v.object({
      duration: v.number(),
      tokensUsed: v.number(),
      toolsUsed: v.array(v.string()),
    }),
    timestamp: v.number(),
  }).index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_timestamp", ["timestamp"]),

  conversationContext: defineTable({
    userId: v.string(),
    sessionId: v.string(),
    context: v.object({
      lastUpdated: v.number(),
      molecularState: v.object({
        activeStructure: v.optional(v.string()),
        selectedElements: v.array(v.string()),
        viewerSettings: v.any(),
        analysisResults: v.array(v.any()),
        searchHistory: v.array(v.string()),
      }),
      userPreferences: v.object({
        expertiseLevel: v.union(v.literal("novice"), v.literal("intermediate"), v.literal("expert")),
        preferredFormat: v.union(v.literal("concise"), v.literal("detailed"), v.literal("technical")),
        domains: v.array(v.string()),
        analysisDepth: v.union(v.literal("basic"), v.literal("intermediate"), v.literal("advanced")),
        visualizations: v.boolean(),
        notifications: v.boolean(),
      }),
      sessionSummary: v.object({
        mainTopics: v.array(v.string()),
        completedAnalyses: v.array(v.string()),
        pendingTasks: v.array(v.string()),
        keyInsights: v.array(v.string()),
        toolsUsed: v.array(v.string()),
        messageCount: v.number(),
        duration: v.number(),
      }),
    }),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_session", ["sessionId"]),

  // Export functionality tables
  exports: defineTable({
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
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),

  exportTemplates: defineTable({
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
    isDefault: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_type", ["type"])
    .index("by_is_default", ["isDefault"]),

  // Advanced features tables
  advancedSettings: defineTable({
    userId: v.string(),
    workspace: v.object({
      theme: v.string(),
      layout: v.string(),
      template: v.string(),
      customizations: v.any(),
    }),
    ai: v.object({
      defaultModel: v.string(),
      customParameters: v.any(),
      systemPrompt: v.optional(v.string()),
      autoSwitch: v.boolean(),
      contextPreservation: v.boolean(),
    }),
    files: v.object({
      defaultPrivacy: v.union(v.literal("private"), v.literal("shared"), v.literal("public")),
      autoProcessing: v.boolean(),
      retentionPolicy: v.object({
        enabled: v.boolean(),
        days: v.number(),
        autoDelete: v.boolean(),
      }),
    }),
    performance: v.object({
      profile: v.string(),
      monitoring: v.boolean(),
      alerts: v.boolean(),
      optimization: v.object({
        autoOptimize: v.boolean(),
        level: v.union(v.literal("conservative"), v.literal("balanced"), v.literal("aggressive")),
      }),
    }),
    shortcuts: v.array(v.any()),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  privateFiles: defineTable({
    userId: v.string(),
    name: v.string(),
    originalName: v.string(),
    size: v.number(),
    type: v.string(),
    mimeType: v.string(),
    uploadedAt: v.number(),
    lastModified: v.number(),
    metadata: v.object({
      description: v.optional(v.string()),
      tags: v.array(v.string()),
      category: v.union(v.literal("pdb"), v.literal("document"), v.literal("data"), v.literal("image"), v.literal("other")),
      isPrivate: v.boolean(),
      processingStatus: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
    }),
    structure: v.optional(v.object({
      format: v.string(),
      chains: v.array(v.string()),
      residueCount: v.number(),
      atomCount: v.number(),
      resolution: v.optional(v.number()),
    })),
    expiresAt: v.optional(v.number()),
  }).index("by_user", ["userId"])
    .index("by_category", ["metadata.category"])
    .index("by_expires", ["expiresAt"]),

  workspaceTemplates: defineTable({
    name: v.string(),
    displayName: v.string(),
    description: v.string(),
    category: v.union(v.literal("research"), v.literal("education"), v.literal("collaboration"), v.literal("analysis"), v.literal("custom")),
    layout: v.any(),
    theme: v.string(),
    features: v.object({
      enabledFeatures: v.array(v.string()),
      disabledFeatures: v.array(v.string()),
      aiModel: v.string(),
      defaultSettings: v.any(),
    }),
    shortcuts: v.array(v.any()),
    isDefault: v.boolean(),
    isPublic: v.boolean(),
    author: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_category", ["category"])
    .index("by_public", ["isPublic"])
    .index("by_author", ["author"]),

  performanceMetrics: defineTable({
    userId: v.string(),
    timestamp: v.number(),
    metrics: v.object({
      cpu: v.object({
        usage: v.number(),
        cores: v.number(),
      }),
      memory: v.object({
        used: v.number(),
        total: v.number(),
        percentage: v.number(),
      }),
      network: v.object({
        downloadSpeed: v.number(),
        uploadSpeed: v.number(),
        latency: v.number(),
      }),
      application: v.object({
        activeUsers: v.number(),
        sessionsCount: v.number(),
        messagesCount: v.number(),
      }),
    }),
  }).index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"]),

  externalIntegrations: defineTable({
    userId: v.string(),
    toolId: v.string(),
    name: v.string(),
    isEnabled: v.boolean(),
    configuration: v.object({
      credentials: v.any(),
      settings: v.any(),
    }),
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("error")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_tool", ["toolId"])
    .index("by_status", ["status"]),

  // API Usage tracking
  apiUsage: defineTable({
    userId: v.string(),
    totalTokens: v.number(),
    totalCost: v.number(),
    requestCount: v.number(),
    createdAt: v.number(),
    lastUsedAt: v.number(),
    requests: v.array(v.object({
      service: v.string(),
      model: v.string(),
      tokens: v.number(),
      cost: v.number(),
      requestType: v.string(),
      timestamp: v.number(),
    })),
    alertSettings: v.optional(v.object({
      costLimit: v.optional(v.number()),
      tokenLimit: v.optional(v.number()),
      requestLimit: v.optional(v.number()),
      alertThreshold: v.optional(v.number()),
    })),
  }).index("by_user", ["userId"])
    .index("by_last_used", ["lastUsedAt"]),
}); 