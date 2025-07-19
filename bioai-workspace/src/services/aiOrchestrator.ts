// AI Orchestrator Service Layer
// Main service for managing AI workflows and coordinating between chat interface and LangGraph.js

import { getWorkflowEngine } from './langgraph';
import { OpenRouterClient, createOpenRouterClient } from './openrouter';
import { ResponseProcessor } from './responseProcessor';
import type { 
  AIWorkflowResult, 
  ConversationContext, 
  AIOrchestrator,
  WorkflowStatus,
  ToolChainResult,
  AvailableTool,
  MolecularContext,
  UserContext,
  SessionContext,
  ToolContext
} from '../types/aiWorkflow';

export class BioAIOrchestrator implements AIOrchestrator {
  private workflowEngine: any;
  private openRouterClient: OpenRouterClient | null = null;
  private responseProcessor: ResponseProcessor;
  private apiKey: string;
  private selectedModel: string = 'openai/gpt-4o-mini';
  private isInitialized = false;
  private fallbackModels: string[] = [
    'openai/gpt-4o-mini',
    'openai/gpt-3.5-turbo',
    'anthropic/claude-3-haiku',
    'meta-llama/llama-3.1-8b-instruct'
  ];

  constructor(apiKey?: string) {
    this.apiKey = apiKey || '';
    this.responseProcessor = new ResponseProcessor();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      if (!this.apiKey) {
        console.warn('No API key provided for AI orchestrator');
        return;
      }

      // Initialize OpenRouter client
      this.openRouterClient = await createOpenRouterClient(this.apiKey);

      // Initialize workflow engine with OpenRouter
      this.workflowEngine = getWorkflowEngine({
        apiKey: this.apiKey,
        model: this.selectedModel,
        temperature: 0.7,
        enableStreaming: true,
        enableCaching: true,
        provider: 'openrouter'
      });

      this.isInitialized = true;
      console.log('BioAI Orchestrator initialized successfully with OpenRouter');
    } catch (error) {
      console.error('Failed to initialize BioAI Orchestrator:', error);
      // Try fallback initialization
      await this.initializeFallback();
    }
  }

  private async initializeFallback(): Promise<void> {
    try {
      console.log('Attempting fallback initialization...');
      
      // Try each fallback model
      for (const model of this.fallbackModels) {
        try {
          if (this.openRouterClient) {
            // Test the model with a simple request
            const testResponse = await this.openRouterClient.createChatCompletion({
              model,
              messages: [{ role: 'user', content: 'Hello' }],
              max_tokens: 10
            });
            
            this.selectedModel = model;
            console.log(`Fallback successful with model: ${model}`);
            this.isInitialized = true;
            return;
          }
        } catch (modelError) {
          console.warn(`Failed to initialize with model ${model}:`, modelError);
        }
      }
      
      throw new Error('All fallback models failed');
    } catch (error) {
      console.error('Fallback initialization failed:', error);
      this.isInitialized = false;
    }
  }

  async processMessage(message: string, context: ConversationContext): Promise<AIWorkflowResult> {
    if (!this.isInitialized || !this.openRouterClient) {
      throw new Error('AI Orchestrator not initialized');
    }

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(message, context);
      const cachedResponse = this.getCachedResponse(cacheKey);
      if (cachedResponse) {
        console.log('Returning cached response');
        return cachedResponse;
      }

      // Optimize model selection for this query
      const optimalModel = await this.optimizeModelForQuery(message);
      if (optimalModel !== this.selectedModel) {
        try {
          await this.switchModel(optimalModel);
        } catch (error) {
          console.warn('Failed to switch to optimal model, using current model');
        }
      }

      // Enhance context with additional information
      const enhancedContext = await this.enhanceContext(context, message);
      
      // Create system prompt based on context
      const systemPrompt = this.createSystemPrompt(enhancedContext);
      
      // Process message through OpenRouter
      const openRouterResponse = await this.openRouterClient.createChatCompletion({
        model: this.selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });

      // Process response through response processor
      const processedResponse = await this.responseProcessor.processResponse(openRouterResponse);
      
      // Convert to AIWorkflowResult format
      const result = this.convertToWorkflowResult(processedResponse, enhancedContext);
      
      // Cache the result
      this.setCachedResponse(cacheKey, result);
      
      // Post-process result for chat interface
      return this.postProcessResult(result, context);
    } catch (error) {
      console.error('Error processing message:', error);
      return this.createErrorResult(message, error, context);
    }
  }

  // Process message with streaming
  async processMessageStream(
    message: string, 
    context: ConversationContext,
    onProgress?: (chunk: string) => void
  ): Promise<AIWorkflowResult> {
    if (!this.isInitialized || !this.openRouterClient) {
      throw new Error('AI Orchestrator not initialized');
    }

    try {
      // Enhance context with additional information
      const enhancedContext = await this.enhanceContext(context, message);
      
      // Create system prompt based on context
      const systemPrompt = this.createSystemPrompt(enhancedContext);
      
      // Process message through OpenRouter with streaming
      const stream = await this.openRouterClient.createChatCompletionStream({
        model: this.selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });

      // Process streaming response
      const processedResponse = await this.responseProcessor.processStreamingResponse(
        stream,
        (state) => {
          if (onProgress) {
            onProgress(state.currentChunk);
          }
        }
      );
      
      // Convert to AIWorkflowResult format
      const result = this.convertToWorkflowResult(processedResponse, enhancedContext);
      
      // Post-process result for chat interface
      return this.postProcessResult(result, context);
    } catch (error) {
      console.error('Error processing streaming message:', error);
      return this.createErrorResult(message, error, context);
    }
  }

  async executeWorkflow(workflowType: string, parameters: any): Promise<AIWorkflowResult> {
    if (!this.isInitialized || !this.workflowEngine) {
      throw new Error('AI Orchestrator not initialized');
    }

    try {
      return await this.workflowEngine.executeWorkflow(workflowType, parameters);
    } catch (error) {
      console.error('Error executing workflow:', error);
      throw error;
    }
  }

  async getWorkflowStatus(workflowId: string): Promise<WorkflowStatus> {
    if (!this.isInitialized || !this.workflowEngine) {
      throw new Error('AI Orchestrator not initialized');
    }

    return await this.workflowEngine.getWorkflowStatus(workflowId);
  }

  async cancelWorkflow(workflowId: string): Promise<boolean> {
    if (!this.isInitialized || !this.workflowEngine) {
      throw new Error('AI Orchestrator not initialized');
    }

    return await this.workflowEngine.cancelWorkflow(workflowId);
  }

  async updateContext(updates: Partial<ConversationContext>): Promise<void> {
    if (!this.isInitialized || !this.workflowEngine) {
      throw new Error('AI Orchestrator not initialized');
    }

    await this.workflowEngine.updateContext(updates);
  }

  async getAvailableTools(): Promise<AvailableTool[]> {
    if (!this.isInitialized || !this.workflowEngine) {
      throw new Error('AI Orchestrator not initialized');
    }

    return await this.workflowEngine.getAvailableTools();
  }

  async executeToolChain(tools: string[], parameters: any[]): Promise<ToolChainResult> {
    if (!this.isInitialized || !this.workflowEngine) {
      throw new Error('AI Orchestrator not initialized');
    }

    return await this.workflowEngine.executeToolChain(tools, parameters);
  }

  // Context enhancement methods
  private async enhanceContext(
    context: ConversationContext, 
    message: string
  ): Promise<ConversationContext> {
    return {
      ...context,
      molecular: await this.enhanceMolecularContext(context.molecular, message),
      user: await this.enhanceUserContext(context.user, message),
      session: await this.enhanceSessionContext(context.session, message),
      tools: await this.enhanceToolContext(context.tools, message)
    };
  }

  private async enhanceMolecularContext(
    molecular: MolecularContext, 
    message: string
  ): Promise<MolecularContext> {
    // Add message analysis to molecular context
    const messageAnalysis = {
      mentionsPDB: this.extractPDBIds(message),
      mentionsResidues: this.extractResidueNumbers(message),
      mentionsChains: this.extractChainIds(message),
      analysisType: this.detectAnalysisType(message)
    };

    return {
      ...molecular,
      messageAnalysis,
      searchHistory: [
        ...molecular.searchHistory,
        ...(messageAnalysis.mentionsPDB.length > 0 ? messageAnalysis.mentionsPDB : [])
      ].slice(-10) // Keep last 10 searches
    };
  }

  private async enhanceUserContext(
    user: UserContext, 
    message: string
  ): Promise<UserContext> {
    // Infer user expertise from message complexity
    const messageComplexity = this.analyzeMessageComplexity(message);
    const inferredLevel = this.inferExpertiseLevel(message, user.expertise.level);

    return {
      ...user,
      expertise: {
        ...user.expertise,
        level: inferredLevel,
        domains: this.updateDomains(user.expertise.domains, message)
      }
    };
  }

  private async enhanceSessionContext(
    session: SessionContext, 
    message: string
  ): Promise<SessionContext> {
    const topics = this.extractTopics(message);
    
    return {
      ...session,
      messageCount: session.messageCount + 1,
      topicsDiscussed: [
        ...session.topicsDiscussed,
        ...topics
      ].slice(-20), // Keep last 20 topics
      duration: Date.now() - session.startTime
    };
  }

  private async enhanceToolContext(
    tools: ToolContext, 
    message: string
  ): Promise<ToolContext> {
    const suggestedTools = this.suggestToolsForMessage(message);
    
    return {
      ...tools,
      suggestedTools,
      messageContext: {
        originalMessage: message,
        timestamp: Date.now(),
        suggestedTools
      }
    };
  }

  // Message analysis helper methods
  private extractPDBIds(message: string): string[] {
    const pdbRegex = /\b[0-9][A-Za-z0-9]{3}\b/g;
    return message.match(pdbRegex) || [];
  }

  private extractResidueNumbers(message: string): number[] {
    const residueRegex = /\b(?:residue|amino acid|aa)\s+(\d+)\b/gi;
    const matches = message.match(residueRegex) || [];
    return matches.map(match => parseInt(match.replace(/\D/g, '')));
  }

  private extractChainIds(message: string): string[] {
    const chainRegex = /\bchain\s+([A-Za-z])\b/gi;
    const matches = message.match(chainRegex) || [];
    return matches.map(match => match.replace(/\D/g, ''));
  }

  private detectAnalysisType(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('structure') || lowerMessage.includes('fold')) {
      return 'structural_analysis';
    }
    if (lowerMessage.includes('sequence') || lowerMessage.includes('motif')) {
      return 'sequence_analysis';
    }
    if (lowerMessage.includes('interaction') || lowerMessage.includes('binding')) {
      return 'interaction_analysis';
    }
    if (lowerMessage.includes('property') || lowerMessage.includes('cavity')) {
      return 'property_analysis';
    }
    if (lowerMessage.includes('compare') || lowerMessage.includes('similar')) {
      return 'comparison_analysis';
    }
    
    return 'general_inquiry';
  }

  private analyzeMessageComplexity(message: string): 'basic' | 'intermediate' | 'advanced' {
    const technicalTerms = [
      'rmsd', 'bfactor', 'crystallography', 'nmr', 'homology', 'phylogenetic',
      'electrostatic', 'hydrophobic', 'allosteric', 'catalytic', 'conformation'
    ];
    
    const complexTerms = [
      'ramachandran', 'stereochemistry', 'torsion', 'dihedral', 'secondary structure',
      'motif', 'domain', 'fold', 'superfamily', 'conservation'
    ];
    
    const technicalCount = technicalTerms.reduce((count, term) => 
      count + (message.toLowerCase().includes(term) ? 1 : 0), 0);
    
    const complexCount = complexTerms.reduce((count, term) => 
      count + (message.toLowerCase().includes(term) ? 1 : 0), 0);
    
    if (complexCount > 2 || technicalCount > 3) return 'advanced';
    if (technicalCount > 1 || complexCount > 0) return 'intermediate';
    return 'basic';
  }

  private inferExpertiseLevel(message: string, currentLevel: string): string {
    const messageComplexity = this.analyzeMessageComplexity(message);
    
    // Gradually adjust expertise level based on message complexity
    if (messageComplexity === 'advanced' && currentLevel === 'novice') {
      return 'intermediate';
    }
    if (messageComplexity === 'advanced' && currentLevel === 'intermediate') {
      return 'expert';
    }
    
    return currentLevel;
  }

  private updateDomains(currentDomains: string[], message: string): string[] {
    const domainKeywords = {
      'structural_biology': ['structure', 'fold', 'conformation', 'crystal'],
      'biochemistry': ['enzyme', 'catalysis', 'binding', 'affinity'],
      'bioinformatics': ['sequence', 'alignment', 'database', 'search'],
      'computational_biology': ['modeling', 'simulation', 'prediction', 'algorithm'],
      'molecular_biology': ['protein', 'gene', 'expression', 'mutation'],
      'pharmacology': ['drug', 'inhibitor', 'binding', 'target']
    };
    
    const newDomains = [...currentDomains];
    const lowerMessage = message.toLowerCase();
    
    Object.entries(domainKeywords).forEach(([domain, keywords]) => {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        if (!newDomains.includes(domain)) {
          newDomains.push(domain);
        }
      }
    });
    
    return newDomains.slice(-5); // Keep last 5 domains
  }

  private extractTopics(message: string): string[] {
    const topics: string[] = [];
    const lowerMessage = message.toLowerCase();
    
    // Extract main topics from message
    if (lowerMessage.includes('structure')) topics.push('structural_analysis');
    if (lowerMessage.includes('sequence')) topics.push('sequence_analysis');
    if (lowerMessage.includes('binding')) topics.push('binding_analysis');
    if (lowerMessage.includes('drug')) topics.push('drug_discovery');
    if (lowerMessage.includes('evolution')) topics.push('evolutionary_analysis');
    
    return topics;
  }

  private suggestToolsForMessage(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    const tools: string[] = [];
    
    if (lowerMessage.includes('search') || lowerMessage.includes('find')) {
      tools.push('pdb_search');
    }
    if (lowerMessage.includes('analyze') || lowerMessage.includes('study')) {
      tools.push('molecular_analysis');
    }
    if (lowerMessage.includes('view') || lowerMessage.includes('show') || lowerMessage.includes('display')) {
      tools.push('viewer_control');
    }
    
    return tools;
  }

  // Result processing methods
  private async postProcessResult(
    result: AIWorkflowResult, 
    context: ConversationContext
  ): Promise<AIWorkflowResult> {
    return {
      ...result,
      response: this.formatResponseForExpertise(result.response, context.user.expertise.level),
      suggestedFollowUps: this.enhanceFollowUps(result.suggestedFollowUps, context),
      metadata: {
        ...result.metadata,
        contextEnhanced: true,
        userLevel: context.user.expertise.level
      }
    };
  }

  private formatResponseForExpertise(response: string, expertiseLevel: string): string {
    // Adjust response complexity based on user expertise
    switch (expertiseLevel) {
      case 'novice':
        return this.simplifyResponse(response);
      case 'expert':
        return this.enhanceResponse(response);
      default:
        return response;
    }
  }

  private simplifyResponse(response: string): string {
    // Simplify technical terms for novice users
    return response
      .replace(/\brmsd\b/gi, 'structural difference')
      .replace(/\bb-factor\b/gi, 'thermal motion')
      .replace(/\bresolution\b/gi, 'image quality')
      .replace(/\bangstrom\b/gi, 'very small distance unit');
  }

  private enhanceResponse(response: string): string {
    // Add more technical detail for expert users
    return response;
  }

  private enhanceFollowUps(followUps: string[], context: ConversationContext): string[] {
    const enhanced = [...followUps];
    
    // Add context-specific follow-ups
    if (context.molecular.currentStructure) {
      enhanced.push(`Analyze ${context.molecular.currentStructure.id} in more detail`);
    }
    
    if (context.molecular.selectedResidues.length > 0) {
      enhanced.push('Study selected residues');
    }
    
    return enhanced.slice(0, 5); // Limit to 5 follow-ups
  }

  // Helper methods for OpenRouter integration
  private createSystemPrompt(context: ConversationContext): string {
    const expertiseLevel = context.user.expertise.level;
    const currentStructure = context.molecular.currentStructure;
    const domains = context.user.expertise.domains;
    
    let prompt = "You are BioAI, an expert assistant for molecular biology and bioinformatics. ";
    
    // Adjust for user expertise
    switch (expertiseLevel) {
      case 'novice':
        prompt += "Explain concepts clearly and avoid overly technical language. ";
        break;
      case 'intermediate':
        prompt += "Provide detailed explanations with some technical detail. ";
        break;
      case 'expert':
        prompt += "Use technical terminology and provide comprehensive analysis. ";
        break;
    }
    
    // Add molecular context
    if (currentStructure) {
      prompt += `Currently analyzing structure: ${currentStructure.id} (${currentStructure.title}). `;
    }
    
    // Add domain expertise
    if (domains.length > 0) {
      prompt += `Focus on: ${domains.join(', ')}. `;
    }
    
    prompt += "Provide actionable insights, suggest follow-up questions, and reference relevant scientific sources when appropriate. ";
    prompt += "If discussing protein structures, mention PDB IDs when relevant. ";
    prompt += "Format responses clearly with proper structure and be concise but comprehensive.";
    
    return prompt;
  }

  private convertToWorkflowResult(
    processedResponse: any, 
    context: ConversationContext
  ): AIWorkflowResult {
    return {
      workflowId: `workflow_${Date.now()}`,
      response: processedResponse.content,
      actions: processedResponse.actions || [],
      newContext: processedResponse.structuredData || {},
      suggestedFollowUps: processedResponse.metadata.suggestedFollowUps || [],
      metadata: {
        tokensUsed: processedResponse.metadata.tokensUsed,
        duration: processedResponse.metadata.processingTime,
        toolsInvoked: [],
        confidence: processedResponse.metadata.confidence,
        sources: processedResponse.metadata.sources
      },
      status: 'completed'
    };
  }

  private createErrorResult(
    message: string, 
    error: any, 
    context: ConversationContext
  ): AIWorkflowResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return {
      workflowId: `error_${Date.now()}`,
      response: `I encountered an error processing your request: ${errorMessage}. Please try rephrasing your question or check if all required information is provided.`,
      actions: [],
      newContext: {},
      suggestedFollowUps: [
        'Try a simpler question',
        'Check if a molecular structure is loaded',
        'Verify your input format'
      ],
      metadata: {
        tokensUsed: 0,
        duration: 0,
        toolsInvoked: [],
        confidence: 0,
        sources: [],
        error: errorMessage
      },
      status: 'failed'
    };
  }

  // Utility methods
  isInitialized(): boolean {
    return this.isInitialized;
  }

  updateApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.initialize();
  }

  // Model management methods
  async switchModel(modelId: string): Promise<void> {
    if (!this.openRouterClient) {
      throw new Error('OpenRouter client not initialized');
    }

    try {
      // Test the new model
      await this.openRouterClient.createChatCompletion({
        model: modelId,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      });
      
      this.selectedModel = modelId;
      console.log(`Switched to model: ${modelId}`);
    } catch (error) {
      console.error(`Failed to switch to model ${modelId}:`, error);
      throw error;
    }
  }

  getCurrentModel(): string {
    return this.selectedModel;
  }

  async getAvailableModels(): Promise<any[]> {
    if (!this.openRouterClient) {
      throw new Error('OpenRouter client not initialized');
    }

    try {
      return await this.openRouterClient.getModels();
    } catch (error) {
      console.error('Failed to get available models:', error);
      return [];
    }
  }

  // Performance optimization methods
  async optimizeModelForQuery(query: string): Promise<string> {
    const queryLength = query.length;
    const complexity = this.analyzeMessageComplexity(query);
    
    // Simple model selection logic
    if (complexity === 'advanced' || queryLength > 500) {
      return 'openai/gpt-4o-mini';
    } else if (complexity === 'intermediate' || queryLength > 200) {
      return 'openai/gpt-3.5-turbo';
    } else {
      return 'meta-llama/llama-3.1-8b-instruct';
    }
  }

  // Caching methods
  private responseCache = new Map<string, { response: AIWorkflowResult; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  private getCachedResponse(key: string): AIWorkflowResult | null {
    const cached = this.responseCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.response;
    }
    return null;
  }

  private setCachedResponse(key: string, response: AIWorkflowResult): void {
    this.responseCache.set(key, { response, timestamp: Date.now() });
    
    // Clean up old cache entries
    if (this.responseCache.size > 100) {
      const oldestKeys = Array.from(this.responseCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, 20)
        .map(([key]) => key);
      
      oldestKeys.forEach(key => this.responseCache.delete(key));
    }
  }

  private generateCacheKey(message: string, context: ConversationContext): string {
    return `${message}_${context.session.id}_${this.selectedModel}`;
  }

  clearCache(): void {
    this.responseCache.clear();
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    if (!this.isInitialized || !this.workflowEngine) {
      return {
        status: 'error',
        details: { error: 'Orchestrator not initialized' }
      };
    }

    try {
      const engineHealth = await this.workflowEngine.healthCheck();
      return {
        status: 'healthy',
        details: {
          orchestrator: 'initialized',
          workflowEngine: engineHealth.status,
          apiKey: !!this.apiKey
        }
      };
    } catch (error) {
      return {
        status: 'error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
}

// Singleton instance for global use
let orchestratorInstance: BioAIOrchestrator | null = null;

export function getOrchestrator(apiKey?: string): BioAIOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new BioAIOrchestrator(apiKey);
  }
  return orchestratorInstance;
}

export function resetOrchestrator(): void {
  orchestratorInstance = null;
}

// Export default orchestrator instance
export default getOrchestrator;