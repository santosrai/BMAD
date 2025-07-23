import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { ChatState, ChatHookReturn, ChatMessage, ChatSession } from '../types/chat';

export const useChat = (userId: string): ChatHookReturn => {
  const [inputValue, setInputValue] = useState('');
  const [isTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Convex mutations
  const createSessionMutation = useMutation(api.chat.createSession);
  const addMessageMutation = useMutation(api.chat.addMessage);
  const updateMessageStatusMutation = useMutation(api.chat.updateMessageStatus);
  const switchSessionMutation = useMutation(api.chat.switchSession);
  const deleteSessionMutation = useMutation(api.chat.deleteSession);
  const clearSessionMessagesMutation = useMutation(api.chat.clearSessionMessages);

  // Convex queries
  const sessions = useQuery(api.chat.getUserSessions, userId ? { userId } : 'skip') || [];
  const activeSession = useQuery(api.chat.getActiveSession, userId ? { userId } : 'skip');
  const messages = useQuery(
    api.chat.getSessionMessages,
    activeSession && userId ? { sessionId: activeSession._id, userId } : 'skip'
  ) || [];

  // Convert Convex data to our types
  const chatSessions: ChatSession[] = sessions.map((session: any) => ({
    id: session._id,
    userId: session.userId,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messageCount: session.messageCount,
    isActive: session.isActive,
  }));

  const chatMessages: ChatMessage[] = messages.map((message: any) => ({
    id: message._id,
    content: message.content,
    timestamp: message.timestamp,
    userId: message.userId,
    sessionId: message.sessionId,
    type: message.type,
    status: message.status,
    metadata: message.metadata,
  }));

  const currentSession: ChatSession | null = activeSession ? {
    id: activeSession._id,
    userId: activeSession.userId,
    title: activeSession.title,
    createdAt: activeSession.createdAt,
    updatedAt: activeSession.updatedAt,
    messageCount: activeSession.messageCount,
    isActive: activeSession.isActive,
  } : null;

  // Actions
  const createSession = useCallback(async (title?: string): Promise<ChatSession> => {
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const sessionId = await createSessionMutation({
        userId,
        title,
      });
      
      // Return the created session (we'll get it from the query update)
      return {
        id: sessionId,
        userId,
        title: title || `Chat Session ${new Date().toLocaleString()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 0,
        isActive: true,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId, createSessionMutation]);

  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!content.trim() || !currentSession || !userId) {
      console.log('useChat: sendMessage early return', { content: content.trim(), hasSession: !!currentSession, hasUserId: !!userId });
      return;
    }

    try {
      console.log('useChat: Starting sendMessage', { content, sessionId: currentSession.id });
      setIsLoading(true);
      setError(null);
      
      // Add user message
      await addMessageMutation({
        sessionId: currentSession.id as Id<'chatSessions'>,
        userId,
        content: content.trim(),
        type: 'user',
        status: 'sent',
      });

      console.log('useChat: User message added, scheduling placeholder response');

      // For now, add a placeholder assistant response
      // This will be replaced with actual AI integration later
      setTimeout(async () => {
        console.log('useChat: Adding placeholder response');
        try {
          await addMessageMutation({
            sessionId: currentSession.id as Id<'chatSessions'>,
            userId,
            content: 'This is a placeholder response. AI integration will be added in future stories.',
            type: 'assistant',
            status: 'sent',
          });
          console.log('useChat: Placeholder response added successfully');
        } catch (error) {
          console.error('useChat: Failed to add placeholder response:', error);
        }
      }, 1000);

      setInputValue('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      console.error('useChat: sendMessage error:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currentSession, userId, addMessageMutation]);

  const switchSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await switchSessionMutation({
        userId,
        sessionId: sessionId as Id<'chatSessions'>,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch session';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId, switchSessionMutation]);

  const deleteSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await deleteSessionMutation({
        sessionId: sessionId as Id<'chatSessions'>,
        userId,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete session';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId, deleteSessionMutation]);

  const clearHistory = useCallback(async (): Promise<void> => {
    if (!currentSession) return;

    try {
      setIsLoading(true);
      setError(null);
      
      await clearSessionMessagesMutation({
        sessionId: currentSession.id as Id<'chatSessions'>,
        userId,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear history';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currentSession, userId, clearSessionMessagesMutation]);

  const updateInputValue = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  const exportChat = useCallback((format: 'json' | 'txt' | 'markdown'): string => {
    if (!chatMessages.length) return '';

    switch (format) {
      case 'json':
        return JSON.stringify({
          session: currentSession,
          messages: chatMessages,
          exportedAt: Date.now(),
        }, null, 2);
      
      case 'txt':
        return chatMessages.map(msg => 
          `[${new Date(msg.timestamp).toLocaleString()}] ${msg.type.toUpperCase()}: ${msg.content}`
        ).join('\n');
      
      case 'markdown':
        return chatMessages.map(msg => 
          `**${msg.type.toUpperCase()}** (${new Date(msg.timestamp).toLocaleString()})\n${msg.content}\n`
        ).join('\n---\n');
      
      default:
        return '';
    }
  }, [chatMessages, currentSession]);

  const retryMessage = useCallback(async (messageId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await updateMessageStatusMutation({
        messageId: messageId as Id<'chatMessages'>,
        userId,
        status: 'sending',
      });

      // Simulate retry logic (to be replaced with actual AI integration)
      setTimeout(async () => {
        await updateMessageStatusMutation({
          messageId: messageId as Id<'chatMessages'>,
          userId,
          status: 'sent',
        });
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to retry message';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId, updateMessageStatusMutation]);

  // Create initial session if none exists
  useEffect(() => {
    if (sessions.length === 0 && !isLoading && userId) {
      createSession();
    }
  }, [sessions.length, isLoading, userId, createSession]);

  const state: ChatState = {
    sessions: chatSessions,
    currentSession,
    messages: chatMessages,
    isLoading,
    error,
    inputValue,
    isTyping,
  };

  return {
    state,
    actions: {
      sendMessage,
      createSession,
      switchSession,
      clearHistory,
      deleteSession,
      updateInputValue,
      exportChat,
      retryMessage,
    },
  };
};