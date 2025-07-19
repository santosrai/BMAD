import { AIModelConfig, AIModelSession, ModelSwitchOptions } from '../types/advanced';

export class AIModelManager {
  private models: Map<string, AIModelConfig> = new Map();
  private sessions: Map<string, AIModelSession> = new Map();

  constructor() {
    this.initializeModels();
  }

  private initializeModels() {
    const defaultModels: AIModelConfig[] = [
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        provider: 'anthropic',
        modelId: 'anthropic/claude-3-sonnet-20240229',
        displayName: 'Claude 3 Sonnet',
        description: 'Balanced model for general molecular analysis and research',
        capabilities: ['text', 'reasoning', 'analysis', 'code'],
        pricing: {
          inputTokens: 0.003,
          outputTokens: 0.015,
          currency: 'USD'
        },
        limits: {
          maxTokens: 4096,
          maxContextLength: 200000,
          rateLimit: 1000
        },
        parameters: {
          temperature: { min: 0, max: 1, default: 0.7 },
          topP: { min: 0, max: 1, default: 0.9 },
          maxTokens: { min: 1, max: 4096, default: 1024 }
        },
        features: {
          streaming: true,
          functionCalling: true,
          imageInput: true,
          codeGeneration: true,
          reasoning: true
        }
      },
      {
        id: 'claude-3-haiku',
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
        modelId: 'anthropic/claude-3-haiku-20240307',
        displayName: 'Claude 3 Haiku',
        description: 'Fast and efficient model for quick molecular queries',
        capabilities: ['text', 'reasoning', 'analysis'],
        pricing: {
          inputTokens: 0.00025,
          outputTokens: 0.00125,
          currency: 'USD'
        },
        limits: {
          maxTokens: 4096,
          maxContextLength: 200000,
          rateLimit: 2000
        },
        parameters: {
          temperature: { min: 0, max: 1, default: 0.7 },
          topP: { min: 0, max: 1, default: 0.9 },
          maxTokens: { min: 1, max: 4096, default: 1024 }
        },
        features: {
          streaming: true,
          functionCalling: true,
          imageInput: true,
          codeGeneration: true,
          reasoning: true
        }
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: 'openai',
        modelId: 'openai/gpt-4',
        displayName: 'GPT-4',
        description: 'Advanced reasoning model for complex molecular analysis',
        capabilities: ['text', 'reasoning', 'analysis', 'code', 'research'],
        pricing: {
          inputTokens: 0.03,
          outputTokens: 0.06,
          currency: 'USD'
        },
        limits: {
          maxTokens: 4096,
          maxContextLength: 8192,
          rateLimit: 500
        },
        parameters: {
          temperature: { min: 0, max: 2, default: 0.7 },
          topP: { min: 0, max: 1, default: 0.9 },
          maxTokens: { min: 1, max: 4096, default: 1024 },
          frequencyPenalty: { min: -2, max: 2, default: 0 },
          presencePenalty: { min: -2, max: 2, default: 0 }
        },
        features: {
          streaming: true,
          functionCalling: true,
          imageInput: false,
          codeGeneration: true,
          reasoning: true
        }
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        modelId: 'openai/gpt-3.5-turbo',
        displayName: 'GPT-3.5 Turbo',
        description: 'Cost-effective model for routine molecular tasks',
        capabilities: ['text', 'reasoning', 'analysis', 'code'],
        pricing: {
          inputTokens: 0.0015,
          outputTokens: 0.002,
          currency: 'USD'
        },
        limits: {
          maxTokens: 4096,
          maxContextLength: 16384,
          rateLimit: 1000
        },
        parameters: {
          temperature: { min: 0, max: 2, default: 0.7 },
          topP: { min: 0, max: 1, default: 0.9 },
          maxTokens: { min: 1, max: 4096, default: 1024 },
          frequencyPenalty: { min: -2, max: 2, default: 0 },
          presencePenalty: { min: -2, max: 2, default: 0 }
        },
        features: {
          streaming: true,
          functionCalling: true,
          imageInput: false,
          codeGeneration: true,
          reasoning: true
        }
      },
      {
        id: 'mixtral-8x7b',
        name: 'Mixtral 8x7B',
        provider: 'openrouter',
        modelId: 'mistralai/mixtral-8x7b-instruct',
        displayName: 'Mixtral 8x7B Instruct',
        description: 'Open-source model for scientific analysis',
        capabilities: ['text', 'reasoning', 'analysis', 'code'],
        pricing: {
          inputTokens: 0.0006,
          outputTokens: 0.0006,
          currency: 'USD'
        },
        limits: {
          maxTokens: 4096,
          maxContextLength: 32768,
          rateLimit: 1500
        },
        parameters: {
          temperature: { min: 0, max: 2, default: 0.7 },
          topP: { min: 0, max: 1, default: 0.9 },
          maxTokens: { min: 1, max: 4096, default: 1024 },
          topK: { min: 1, max: 100, default: 40 }
        },
        features: {
          streaming: true,
          functionCalling: false,
          imageInput: false,
          codeGeneration: true,
          reasoning: true
        }
      }
    ];

    defaultModels.forEach(model => {
      this.models.set(model.id, model);
    });
  }

  getAvailableModels(): AIModelConfig[] {
    return Array.from(this.models.values());
  }

  getModel(modelId: string): AIModelConfig | null {
    return this.models.get(modelId) || null;
  }

  getModelsByProvider(provider: string): AIModelConfig[] {
    return Array.from(this.models.values()).filter(model => model.provider === provider);
  }

  getModelsByCapability(capability: string): AIModelConfig[] {
    return Array.from(this.models.values()).filter(model => 
      model.capabilities.includes(capability)
    );
  }

  createModelSession(sessionId: string, modelId: string, customParameters?: Record<string, any>): AIModelSession {
    const session: AIModelSession = {
      sessionId,
      currentModel: modelId,
      modelHistory: [{
        modelId,
        timestamp: Date.now(),
        messageCount: 0,
        switchReason: 'Initial session creation'
      }],
      customParameters: customParameters || {},
      conversationContext: {}
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  getModelSession(sessionId: string): AIModelSession | null {
    return this.sessions.get(sessionId) || null;
  }

  async switchModel(sessionId: string, newModelId: string, options: ModelSwitchOptions): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const newModel = this.getModel(newModelId);
    if (!newModel) {
      throw new Error('Model not found');
    }

    const currentModel = this.getModel(session.currentModel);
    if (!currentModel) {
      throw new Error('Current model not found');
    }

    try {
      // Handle context preservation
      let preservedContext = null;
      if (options.preserveContext) {
        preservedContext = await this.preserveContext(session, currentModel, newModel);
      }

      // Handle conversation migration
      if (options.migrateConversation) {
        await this.migrateConversation(session, currentModel, newModel);
      }

      // Update session
      session.currentModel = newModelId;
      session.modelHistory.push({
        modelId: newModelId,
        timestamp: Date.now(),
        messageCount: 0,
        switchReason: options.reasonForSwitch
      });

      if (options.customParameters) {
        session.customParameters = { ...session.customParameters, ...options.customParameters };
      }

      if (preservedContext) {
        session.conversationContext = preservedContext;
      }

      this.sessions.set(sessionId, session);
      return true;
    } catch (error) {
      console.error('Model switching failed:', error);
      return false;
    }
  }

  private async preserveContext(session: AIModelSession, currentModel: AIModelConfig, newModel: AIModelConfig): Promise<any> {
    // Implement context preservation logic
    // This would involve summarizing or reformatting the conversation context
    // to be compatible with the new model
    
    const context = session.conversationContext;
    
    // If models are from the same provider, context might be directly compatible
    if (currentModel.provider === newModel.provider) {
      return context;
    }

    // Otherwise, create a summary or reformatted version
    return {
      ...context,
      modelSwitchSummary: {
        previousModel: currentModel.id,
        newModel: newModel.id,
        timestamp: Date.now(),
        contextPreserved: true
      }
    };
  }

  private async migrateConversation(session: AIModelSession, currentModel: AIModelConfig, newModel: AIModelConfig): Promise<void> {
    // Implement conversation migration logic
    // This would involve reformatting messages to be compatible with the new model
    
    // For now, just add a migration marker
    session.conversationContext = {
      ...session.conversationContext,
      migrationInfo: {
        fromModel: currentModel.id,
        toModel: newModel.id,
        timestamp: Date.now(),
        migrated: true
      }
    };
  }

  updateSessionParameters(sessionId: string, parameters: Record<string, any>): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.customParameters = { ...session.customParameters, ...parameters };
    this.sessions.set(sessionId, session);
    return true;
  }

  getModelRecommendations(context: {
    taskType: string;
    complexityLevel: 'low' | 'medium' | 'high';
    budgetConstraint: 'low' | 'medium' | 'high';
    performanceRequirement: 'speed' | 'accuracy' | 'balanced';
  }): AIModelConfig[] {
    const models = this.getAvailableModels();
    
    return models
      .filter(model => {
        // Filter by task type
        if (context.taskType === 'analysis' && !model.capabilities.includes('analysis')) {
          return false;
        }
        if (context.taskType === 'code' && !model.capabilities.includes('code')) {
          return false;
        }
        if (context.taskType === 'reasoning' && !model.capabilities.includes('reasoning')) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Sort by preference based on context
        let scoreA = 0;
        let scoreB = 0;

        // Budget scoring
        if (context.budgetConstraint === 'low') {
          scoreA += (1 / a.pricing.inputTokens) * 10;
          scoreB += (1 / b.pricing.inputTokens) * 10;
        }

        // Performance scoring
        if (context.performanceRequirement === 'speed') {
          scoreA += a.limits.rateLimit / 100;
          scoreB += b.limits.rateLimit / 100;
        } else if (context.performanceRequirement === 'accuracy') {
          scoreA += a.limits.maxContextLength / 1000;
          scoreB += b.limits.maxContextLength / 1000;
        }

        // Complexity scoring
        if (context.complexityLevel === 'high') {
          scoreA += a.features.reasoning ? 20 : 0;
          scoreB += b.features.reasoning ? 20 : 0;
          scoreA += a.features.functionCalling ? 10 : 0;
          scoreB += b.features.functionCalling ? 10 : 0;
        }

        return scoreB - scoreA;
      });
  }

  getModelUsageStats(sessionId: string): {
    totalMessages: number;
    totalTokens: number;
    totalCost: number;
    modelDistribution: Record<string, number>;
    averageResponseTime: number;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        totalMessages: 0,
        totalTokens: 0,
        totalCost: 0,
        modelDistribution: {},
        averageResponseTime: 0
      };
    }

    const stats = {
      totalMessages: session.modelHistory.reduce((sum, entry) => sum + entry.messageCount, 0),
      totalTokens: 0, // Would need to track this
      totalCost: 0, // Would need to calculate this
      modelDistribution: {} as Record<string, number>,
      averageResponseTime: 0 // Would need to track this
    };

    // Calculate model distribution
    session.modelHistory.forEach(entry => {
      stats.modelDistribution[entry.modelId] = 
        (stats.modelDistribution[entry.modelId] || 0) + entry.messageCount;
    });

    return stats;
  }

  validateModelParameters(modelId: string, parameters: Record<string, any>): { valid: boolean; errors: string[] } {
    const model = this.getModel(modelId);
    if (!model) {
      return { valid: false, errors: ['Model not found'] };
    }

    const errors: string[] = [];

    Object.entries(parameters).forEach(([key, value]) => {
      const paramConfig = model.parameters[key as keyof typeof model.parameters];
      if (!paramConfig) {
        errors.push(`Parameter ${key} is not supported by model ${model.name}`);
        return;
      }

      if (typeof value === 'number') {
        if (value < paramConfig.min || value > paramConfig.max) {
          errors.push(`Parameter ${key} must be between ${paramConfig.min} and ${paramConfig.max}`);
        }
      }
    });

    return { valid: errors.length === 0, errors };
  }

  async estimateTokens(text: string): Promise<number> {
    // Simple token estimation - in a real implementation, you'd use a proper tokenizer
    return Math.ceil(text.length / 4);
  }

  async estimateCost(modelId: string, inputTokens: number, outputTokens: number): Promise<number> {
    const model = this.getModel(modelId);
    if (!model) {
      return 0;
    }

    const inputCost = (inputTokens / 1000) * model.pricing.inputTokens;
    const outputCost = (outputTokens / 1000) * model.pricing.outputTokens;
    
    return inputCost + outputCost;
  }

  clearSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  getAllSessions(): AIModelSession[] {
    return Array.from(this.sessions.values());
  }
}

export const aiModelManager = new AIModelManager();