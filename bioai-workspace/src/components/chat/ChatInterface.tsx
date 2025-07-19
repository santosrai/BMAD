import React, { useEffect, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../../hooks/useAuth';
import { useChat } from '../../hooks/useChat';
import { useAIWorkflow } from '../../hooks/useAIWorkflow';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatHeader from './ChatHeader';
import ChatSessionList from './ChatSessionList';
import type { Id } from '../../../convex/_generated/dataModel';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  className?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showSessions, setShowSessions] = React.useState(false);
  const [aiEnabled, setAiEnabled] = React.useState(true); // Re-enable AI for testing
  
  const userId = user?.id || user?.emailAddresses?.[0]?.emailAddress || '';
  const { state, actions } = useChat(userId);
  
  // Get user's OpenRouter API key
  const userApiKey = useQuery(api.apiKeys.getApiKeyForService, userId ? { userId } : 'skip');
  
  // Debug: Log API key status
  console.log('API Key Debug:', { userId, userApiKey, hasApiKey: !!userApiKey });
  
  // Convex mutation for direct message adding
  const addMessageMutation = useMutation(api.chat.addMessage);
  
  // Initialize AI workflow hook
  const aiWorkflow = useAIWorkflow({
    userId,
    sessionId: state.currentSession?.id || '',
    apiKey: userApiKey || undefined,
    autoSave: true,
    contextPersistence: true
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  const handleSendMessage = async (content: string) => {
    try {
      // Store the original sendMessage function
      const originalSendMessage = actions.sendMessage;
      
      // If AI is enabled and we have a session, process through AI workflow
      if (aiEnabled && state.currentSession) {
        try {
          // Override the sendMessage to intercept and replace with AI response
          actions.sendMessage = async (userMessage: string) => {
            // Add user message first
            await addMessageMutation({
              sessionId: state.currentSession!.id as Id<'chatSessions'>,
              userId,
              content: userMessage.trim(),
              type: 'user',
              status: 'sent',
            });
            
            // Process through AI workflow
            const aiResult = await aiWorkflow.actions.processMessage(userMessage);
            
            // Add AI response
            await addMessageMutation({
              sessionId: state.currentSession!.id as Id<'chatSessions'>,
              userId,
              content: aiResult.response,
              type: 'assistant',
              status: 'sent',
              metadata: {
                workflowId: aiResult.workflowId,
                tokensUsed: aiResult.metadata.tokensUsed,
                toolsInvoked: aiResult.metadata.toolsInvoked,
                confidence: aiResult.metadata.confidence,
                sources: aiResult.metadata.sources,
                suggestedFollowUps: aiResult.suggestedFollowUps
              }
            });
            
            // Update local context based on AI workflow result
            if (aiResult.newContext) {
              aiWorkflow.actions.updateContext(aiResult.newContext);
            }
          };
          
          // Send the message with AI processing
          await actions.sendMessage(content);
        } catch (aiError) {
          console.error('AI processing failed:', aiError);
          // Fallback to original behavior with error message
          await addMessageMutation({
            sessionId: state.currentSession!.id as Id<'chatSessions'>,
            userId,
            content: content.trim(),
            type: 'user',
            status: 'sent',
          });
          
          await addMessageMutation({
            sessionId: state.currentSession!.id as Id<'chatSessions'>,
            userId,
            content: "I'm experiencing technical difficulties with AI processing. Please try again or rephrase your question.",
            type: 'assistant',
            status: 'sent',
            metadata: {
              error: aiError instanceof Error ? aiError.message : 'Unknown AI error',
              fallback: true
            }
          });
        } finally {
          // Restore original sendMessage function
          actions.sendMessage = originalSendMessage;
        }
      } else {
        // Use original sendMessage behavior when AI is disabled
        await actions.sendMessage(content);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (state.inputValue.trim()) {
        handleSendMessage(state.inputValue);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Global keyboard shortcuts
    if ((e.ctrlKey || e.metaKey) && isAuthenticated && user) {
      switch (e.key) {
        case 'k':
          e.preventDefault();
          actions.clearHistory();
          break;
        case 'n':
          e.preventDefault();
          actions.createSession();
          break;
        default:
          break;
      }
    }
  };

  const { isLoading: authLoading, isAuthenticated } = useAuth();
  
  if (authLoading) {
    return (
      <Card className={cn("flex flex-col h-full max-h-[600px] bg-background border shadow-lg", className)}>
        <div className="flex items-center justify-center h-full p-8">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Card>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Card className={cn("flex flex-col h-full max-h-[600px] bg-background border shadow-lg", className)}>
        <div className="flex items-center justify-center h-full p-8 text-center">
          <p className="text-muted-foreground">Please log in to use the chat interface.</p>
        </div>
      </Card>
    );
  }

  // Show API key prompt if user hasn't set their OpenRouter key and AI is enabled
  if (aiEnabled && userId && !userApiKey) {
    return (
      <Card className={cn("flex flex-col h-full max-h-[600px] bg-background border shadow-lg", className)}>
        <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
          <h3 className="text-lg font-semibold text-foreground">🔑 OpenRouter API Key Required</h3>
          <div className="space-y-2 text-muted-foreground">
            <p>To use AI features, please set your OpenRouter API key in the settings.</p>
            <p>
              You can get a free API key from{' '}
              <a 
                href="https://openrouter.ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                OpenRouter.ai
              </a>
            </p>
          </div>
          <button 
            onClick={() => setAiEnabled(false)}
            className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg border transition-colors"
          >
            Use Basic Chat (No AI)
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div 
      className={cn("flex flex-col h-full max-h-[100vh] bg-gray-900 text-white overflow-hidden", className)}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Chat interface"
      tabIndex={0}
    >
      <ChatHeader
        currentSession={state.currentSession}
        onToggleSessions={() => setShowSessions(!showSessions)}
        onClearHistory={actions.clearHistory}
        onExportChat={actions.exportChat}
        isLoading={state.isLoading}
        aiEnabled={aiEnabled}
        onToggleAI={() => setAiEnabled(!aiEnabled)}
        aiWorkflowState={aiWorkflow.state}
        onClearAIHistory={aiWorkflow.actions.clearHistory}
        onExportAIHistory={aiWorkflow.actions.exportWorkflowHistory}
        messages={state.messages}
      />
      
      {showSessions && (
        <ChatSessionList
          sessions={state.sessions}
          currentSession={state.currentSession}
          onSessionSelect={actions.switchSession}
          onSessionDelete={actions.deleteSession}
          onNewSession={actions.createSession}
          isLoading={state.isLoading}
        />
      )}
      
      <ScrollArea 
        className="flex-1 p-6 chat-scroll"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {state.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-8">
            <div className="space-y-3">
              <h3 className="text-3xl font-bold gradient-text">Welcome to BioAI Chat</h3>
              <p className="text-muted-foreground/80 leading-relaxed max-w-lg text-lg">
                Start a conversation about molecular analysis, protein structures, or bioinformatics research.
              </p>
            </div>
            <div className="grid gap-4 w-full max-w-md" role="group" aria-label="Suggested questions">
              <button 
                onClick={() => handleSendMessage("What can you help me with?")}
                disabled={state.isLoading}
                aria-label="Ask what the assistant can help with"
                className="px-6 py-4 text-sm bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 rounded-xl border-2 border-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed chat-hover-lift btn-press shadow-sm"
              >
                What can you help me with?
              </button>
              <button 
                onClick={() => handleSendMessage("Analyze protein structure")}
                disabled={state.isLoading}
                aria-label="Ask about protein structure analysis"
                className="px-6 py-4 text-sm bg-gradient-to-br from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 text-emerald-700 rounded-xl border-2 border-emerald-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed chat-hover-lift btn-press shadow-sm"
              >
                Analyze protein structure
              </button>
              <button 
                onClick={() => handleSendMessage("Explain molecular interactions")}
                disabled={state.isLoading}
                aria-label="Ask about molecular interactions"
                className="px-6 py-4 text-sm bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 text-purple-700 rounded-xl border-2 border-purple-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed chat-hover-lift btn-press shadow-sm"
              >
                Explain molecular interactions
              </button>
            </div>
          </div>
        ) : (
          state.messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onRetry={() => actions.retryMessage(message.id)}
              isLoading={state.isLoading}
            />
          ))
        )}
        
        {state.isLoading && (
          <div 
            className="flex justify-center p-6"
            role="status"
            aria-label="Assistant is typing"
          >
            <div className="typing-dots">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </ScrollArea>

      {state.error && (
        <div 
          className="flex items-center justify-between p-4 mx-6 mb-6 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 shadow-sm"
          role="alert"
          aria-live="assertive"
        >
          <span className="text-sm font-medium">{state.error}</span>
          <button 
            onClick={() => actions.sendMessage(state.inputValue)}
            aria-label="Retry sending message"
            className="px-4 py-2 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
          >
            Retry
          </button>
        </div>
      )}

      <ChatInput
        value={state.inputValue}
        onChange={actions.updateInputValue}
        onSend={handleSendMessage}
        onKeyPress={handleKeyPress}
        disabled={state.isLoading || !state.currentSession}
        placeholder="Ask about molecular structures, proteins, or bioinformatics..."
      />
    </div>
  );
};

export default ChatInterface;