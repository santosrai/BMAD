import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  OpenRouterClient, 
  OpenRouterChatRequest, 
  OpenRouterResponse, 
  OpenRouterStreamChunk,
  createOpenRouterClient,
  formatModelForUI 
} from '../services/openrouter';
import { useAuth } from './useAuth';

export interface UseOpenRouterState {
  client: OpenRouterClient | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  models: any[];
  selectedModel: string | null;
  usage: {
    totalTokens: number;
    totalCost: number;
    requestCount: number;
  };
}

export interface UseOpenRouterActions {
  connect: (apiKey: string) => Promise<void>;
  disconnect: () => void;
  setSelectedModel: (modelId: string) => void;
  sendMessage: (messages: OpenRouterChatRequest['messages'], options?: Partial<OpenRouterChatRequest>) => Promise<OpenRouterResponse>;
  sendStreamingMessage: (messages: OpenRouterChatRequest['messages'], options?: Partial<OpenRouterChatRequest>) => Promise<ReadableStream<OpenRouterStreamChunk>>;
  refreshModels: () => Promise<void>;
  clearUsage: () => void;
}

export function useOpenRouter(): {
  state: UseOpenRouterState;
  actions: UseOpenRouterActions;
} {
  const { user } = useAuth();
  const userId = user?.id || user?.emailAddresses?.[0]?.emailAddress || '';
  
  // State
  const [client, setClient] = useState<OpenRouterClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModelState] = useState<string | null>(null);
  const [usage, setUsage] = useState({
    totalTokens: 0,
    totalCost: 0,
    requestCount: 0
  });

  // Convex queries and mutations
  const userApiKey = useQuery(api.apiKeys.getApiKeyForService, userId ? { userId } : 'skip');
  const updateUsage = useMutation(api.apiUsage.updateUsage);
  const getUsage = useQuery(api.apiUsage.getUserUsage, userId ? { userId } : 'skip');

  // Initialize client when API key is available
  useEffect(() => {
    if (userApiKey && !client) {
      connect(userApiKey);
    }
  }, [userApiKey]);

  // Load usage data
  useEffect(() => {
    if (getUsage) {
      setUsage({
        totalTokens: getUsage.totalTokens || 0,
        totalCost: getUsage.totalCost || 0,
        requestCount: getUsage.requestCount || 0
      });
    }
  }, [getUsage]);

  // Actions
  const connect = useCallback(async (apiKey: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newClient = await createOpenRouterClient(apiKey);
      setClient(newClient);
      setIsConnected(true);
      
      // Load models
      const availableModels = await newClient.getModels();
      const formattedModels = availableModels.map(formatModelForUI);
      setModels(formattedModels);
      
      // Set default model if none selected
      if (!selectedModel && formattedModels.length > 0) {
        setSelectedModelState(formattedModels[0].id);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to OpenRouter';
      setError(errorMessage);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [selectedModel]);

  const disconnect = useCallback(() => {
    setClient(null);
    setIsConnected(false);
    setModels([]);
    setSelectedModelState(null);
    setError(null);
  }, []);

  const setSelectedModel = useCallback((modelId: string) => {
    setSelectedModelState(modelId);
  }, []);

  const sendMessage = useCallback(async (
    messages: OpenRouterChatRequest['messages'], 
    options?: Partial<OpenRouterChatRequest>
  ): Promise<OpenRouterResponse> => {
    if (!client || !selectedModel) {
      throw new Error('OpenRouter client not connected or no model selected');
    }

    const request: OpenRouterChatRequest = {
      model: selectedModel,
      messages,
      max_tokens: 1000,
      temperature: 0.7,
      ...options
    };

    try {
      const response = await client.createChatCompletion(request);
      
      // Track usage
      if (response.usage && userId) {
        const cost = await client.calculateCost(
          selectedModel,
          response.usage.prompt_tokens,
          response.usage.completion_tokens
        );
        
        await updateUsage({
          userId,
          service: 'openrouter',
          model: selectedModel,
          tokens: response.usage.total_tokens,
          cost,
          requestType: 'chat'
        });
        
        // Update local usage state
        setUsage(prev => ({
          totalTokens: prev.totalTokens + response.usage.total_tokens,
          totalCost: prev.totalCost + cost,
          requestCount: prev.requestCount + 1
        }));
      }
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      throw err;
    }
  }, [client, selectedModel, userId, updateUsage]);

  const sendStreamingMessage = useCallback(async (
    messages: OpenRouterChatRequest['messages'], 
    options?: Partial<OpenRouterChatRequest>
  ): Promise<ReadableStream<OpenRouterStreamChunk>> => {
    if (!client || !selectedModel) {
      throw new Error('OpenRouter client not connected or no model selected');
    }

    const request: OpenRouterChatRequest = {
      model: selectedModel,
      messages,
      max_tokens: 1000,
      temperature: 0.7,
      stream: true,
      ...options
    };

    try {
      const stream = await client.createChatCompletionStream(request);
      
      // Track usage for streaming (estimated)
      if (userId) {
        const estimatedTokens = await client.estimateTokens(messages.map(m => m.content).join(' '));
        const estimatedCost = await client.calculateCost(selectedModel, estimatedTokens, estimatedTokens);
        
        await updateUsage({
          userId,
          service: 'openrouter',
          model: selectedModel,
          tokens: estimatedTokens,
          cost: estimatedCost,
          requestType: 'streaming'
        });
      }
      
      return stream;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send streaming message';
      setError(errorMessage);
      throw err;
    }
  }, [client, selectedModel, userId, updateUsage]);

  const refreshModels = useCallback(async () => {
    if (!client) return;
    
    try {
      setIsLoading(true);
      const availableModels = await client.getModels();
      const formattedModels = availableModels.map(formatModelForUI);
      setModels(formattedModels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh models');
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const clearUsage = useCallback(() => {
    setUsage({
      totalTokens: 0,
      totalCost: 0,
      requestCount: 0
    });
  }, []);

  return {
    state: {
      client,
      isConnected,
      isLoading,
      error,
      models,
      selectedModel,
      usage
    },
    actions: {
      connect,
      disconnect,
      setSelectedModel,
      sendMessage,
      sendStreamingMessage,
      refreshModels,
      clearUsage
    }
  };
}