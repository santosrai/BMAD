import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../../hooks/useAuth';
import { useChat } from '../../hooks/useChat';
import { useAIWorkflow } from '../../hooks/useAIWorkflow';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatHeader from './ChatHeader';
import ChatSessionList from './ChatSessionList';
import TypingIndicator from './TypingIndicator';
import type { Id } from '../../../convex/_generated/dataModel';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { MessageCircle, Sparkles, Zap, Brain, Plus, Download, Settings, History, MoreHorizontal, FileText, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import '../../styles/chat.css';

interface ChatInterfaceProps {
  className?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showSessions, setShowSessions] = React.useState(false);
  const [aiEnabled, setAiEnabled] = React.useState(true);
  const [isUserScrolled, setIsUserScrolled] = React.useState(false);
  
  // For testing purposes, allow unauthenticated access with a fallback user
  const effectiveUser = user || { id: 'test-user', emailAddresses: [{ emailAddress: 'test@example.com' }] };
  const effectiveUserId = effectiveUser.id || effectiveUser.emailAddresses?.[0]?.emailAddress || 'test-user';
  
  const userId = effectiveUserId;
  const { state, actions } = useChat(userId);
  
  // Get user's OpenRouter API key
  const userApiKey = useQuery(api.apiKeys.getApiKeyForService, userId ? { userId } : 'skip');
  
  // Debug: Log API key status (only when it changes)
  useEffect(() => {
    console.log('API Key Debug:', { userId, userApiKey, hasApiKey: !!userApiKey });
  }, [userId, userApiKey]);
  
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

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50; // 50px threshold
    setIsUserScrolled(!isAtBottom);
  };

  // Auto-scroll when new messages arrive (only if user hasn't manually scrolled up)
  useEffect(() => {
    if (!isUserScrolled) {
      scrollToBottom('smooth');
    }
  }, [state.messages, isUserScrolled]);

  // Auto-scroll when typing indicator appears/disappears
  useEffect(() => {
    if (state.isLoading || aiWorkflow.state.isProcessing) {
      scrollToBottom('smooth');
    }
  }, [state.isLoading, aiWorkflow.state.isProcessing]);

  // Force scroll to bottom when sending a new message
  const forceScrollToBottom = () => {
    setIsUserScrolled(false);
    setTimeout(() => scrollToBottom('auto'), 100);
  };

  const handleSendMessage = async (content: string) => {
    // Clear input and force scroll immediately for better UX
    actions.updateInputValue('');
    forceScrollToBottom();
    
    try {
      console.log('ChatInterface: Starting message processing', { content, aiEnabled, hasSession: !!state.currentSession, hasApiKey: !!userApiKey });
      
      // If AI is enabled and we have a session, process through AI workflow
      if (aiEnabled && state.currentSession) {
        try {
          console.log('ChatInterface: Processing with AI workflow');
          
          // Add user message first
          await addMessageMutation({
            sessionId: state.currentSession!.id as Id<'chatSessions'>,
            userId,
            content: content.trim(),
            type: 'user',
            status: 'sent',
          });
          
          console.log('ChatInterface: User message added, processing AI response');
          
          
          // Process through AI workflow
          const aiResult = await aiWorkflow.actions.processMessage(content);
          
          console.log('ChatInterface: AI result received', { response: aiResult.response, status: aiResult.status });
          
          // Add AI response
          await addMessageMutation({
            sessionId: state.currentSession!.id as Id<'chatSessions'>,
            userId,
            content: aiResult.response,
            type: 'assistant',
            status: 'sent'
          });
        } catch (error) {
          console.error('ChatInterface: AI workflow error', error);
          
          // Fallback: Add a simple AI response
          const fallbackResponse = "I'm here to help with your bioinformatics questions! What would you like to know about molecular structures, proteins, or bioinformatics research?";
          
          await addMessageMutation({
            sessionId: state.currentSession!.id as Id<'chatSessions'>,
            userId,
            content: fallbackResponse,
            type: 'assistant',
            status: 'sent'
          });
        }
      } else {
        // Simple echo for testing when AI is disabled
        console.log('ChatInterface: AI disabled, using simple echo');
        
        if (state.currentSession) {
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
            content: `You said: "${content.trim()}". This is a test response.`,
            type: 'assistant',
            status: 'sent',
          });
        }
      }
    } catch (error) {
      console.error('ChatInterface: Error sending message', error);
      // Note: Error handling is managed by the chat state
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
    if (e.key === 'Escape') {
      setShowSessions(false);
    }
  };

  // Menu action handlers
  const handleNewChat = async () => {
    try {
      await actions.createSession();
      setShowSessions(false);
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  const handleExportChat = () => {
    if (state.currentSession && state.messages.length > 0) {
      const exportData = actions.exportChat('json');
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bioai-chat-${state.currentSession.title || 'session'}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleClearHistory = async () => {
    if (state.currentSession && window.confirm('Are you sure you want to clear this chat history?')) {
      try {
        await actions.clearHistory();
      } catch (error) {
        console.error('Failed to clear history:', error);
      }
    }
  };

  const handleDeleteSession = async () => {
    if (state.currentSession && window.confirm('Are you sure you want to delete this chat session?')) {
      try {
        await actions.deleteSession(state.currentSession.id);
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    }
  };

  // Fallback for authentication issues
  if (!user && !effectiveUser) {
    console.log('ChatInterface: No user, disabling AI');
    setAiEnabled(false);
  }

  return (
    <div 
      className={cn("chat-interface relative flex flex-col h-full max-h-full bg-white rounded-xl shadow-sm border border-gray-100", className)}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Chat interface"
      tabIndex={0}
    >
      {/* Enhanced Header with Better Spacing */}
      <div className="chat-header flex items-center justify-between p-5 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-sm">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="space-y-1">
            <h2 className="font-semibold text-foreground text-base">BioAI Assistant</h2>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* AI Status Badge with Better Separation */}
          <div className={cn(
            "chat-status-badge px-3 py-1.5 rounded-full text-xs font-medium border shadow-sm transition-colors",
            aiEnabled 
              ? "active bg-green-50 text-green-700 border-green-200" 
              : "inactive bg-muted text-muted-foreground border-border"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full mr-2 inline-block",
              aiEnabled ? "bg-green-500" : "bg-muted-foreground"
            )} />
            {aiEnabled ? "AI Active" : "AI Off"}
          </div>
          
          {/* Enhanced Action Buttons with Better Alignment */}
          <div className="flex items-center gap-2">
            {/* New Chat Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              className="chat-btn-press h-9 w-9 p-0 hover:bg-primary/10 text-primary border border-transparent hover:border-primary/20 shadow-sm transition-all"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </Button>
            
            {/* History Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSessions(!showSessions)}
              className={cn(
                "h-9 w-9 p-0 border transition-all shadow-sm",
                showSessions 
                  ? "bg-primary/10 text-primary border-primary/20" 
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground border-transparent hover:border-border"
              )}
              title="Chat History"
            >
              <History className="w-4 h-4" />
            </Button>
            
            {/* More Options Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 hover:bg-accent hover:text-accent-foreground text-muted-foreground border border-transparent hover:border-border shadow-sm transition-all"
                  title="More Options"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleExportChat} disabled={!state.currentSession || state.messages.length === 0}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Chat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleClearHistory} disabled={!state.currentSession || state.messages.length === 0}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Clear History
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDeleteSession} disabled={!state.currentSession}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Session
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setAiEnabled(!aiEnabled)}>
                  <Settings className="w-4 h-4 mr-2" />
                  {aiEnabled ? 'Disable AI' : 'Enable AI'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      {showSessions && (
        <ChatSessionList
          sessions={state.sessions}
          currentSession={state.currentSession}
          onSessionSelect={actions.switchSession}
          onSessionDelete={actions.deleteSession}
          onNewSession={actions.createSession}
          isLoading={state.isLoading || aiWorkflow.state.isProcessing}
        />
      )}
      
      {/* Messages Area - Scrollable */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-6 min-h-0 chat-messages-scroll"
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {state.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-8 px-4">
            <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
              <MessageCircle className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-foreground">Welcome to BioAI</h3>
              <p className="text-muted-foreground max-w-md leading-relaxed">
                I'm here to help with molecular analysis, protein structures, and bioinformatics research. 
                Choose a topic below or ask me anything!
              </p>
            </div>
            
            {/* Enhanced Quick Actions with Better Visual Hierarchy */}
            <div className="grid gap-4 w-full max-w-md">
              <Button
                variant="outline"
                onClick={() => handleSendMessage("What can you help me with?")}
                disabled={state.isLoading || aiWorkflow.state.isProcessing}
                className={cn(
                  "flex items-center gap-4 p-4 h-auto text-left justify-start",
                  "bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15",
                  "border-primary/20 hover:border-primary/30 shadow-sm hover:shadow-md",
                  "transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group",
                  "transform hover:scale-[1.02] active:scale-[0.98]"
                )}
                title="Ask about my capabilities"
              >
                <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors shadow-sm">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-foreground">What can you help me with?</div>
                  <div className="text-xs text-muted-foreground mt-1">Discover my capabilities</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleSendMessage("Analyze protein structure")}
                disabled={state.isLoading || aiWorkflow.state.isProcessing}
                className={cn(
                  "flex items-center gap-4 p-4 h-auto text-left justify-start",
                  "bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100",
                  "border-green-200 hover:border-green-300 shadow-sm hover:shadow-md",
                  "transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group",
                  "transform hover:scale-[1.02] active:scale-[0.98]"
                )}
                title="Get protein structural analysis"
              >
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors shadow-sm">
                  <Zap className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-foreground">Analyze protein structure</div>
                  <div className="text-xs text-muted-foreground mt-1">Get structural insights</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleSendMessage("Explain molecular interactions")}
                disabled={state.isLoading || aiWorkflow.state.isProcessing}
                className={cn(
                  "flex items-center gap-4 p-4 h-auto text-left justify-start",
                  "bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100",
                  "border-purple-200 hover:border-purple-300 shadow-sm hover:shadow-md",
                  "transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group",
                  "transform hover:scale-[1.02] active:scale-[0.98]"
                )}
                title="Learn about molecular binding mechanisms"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors shadow-sm">
                  <Brain className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-foreground">Explain molecular interactions</div>
                  <div className="text-xs text-muted-foreground mt-1">Understand binding mechanisms</div>
                </div>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {state.messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onRetry={() => actions.retryMessage(message.id)}
                isLoading={state.isLoading || aiWorkflow.state.isProcessing}
              />
            ))}
          </div>
        )}
        
        {(state.isLoading || aiWorkflow.state.isProcessing) && (
          <TypingIndicator />
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button - Shows when user has scrolled up */}
      {isUserScrolled && (
        <div className="absolute bottom-20 right-6 z-10">
          <Button
            onClick={() => {
              setIsUserScrolled(false);
              scrollToBottom('smooth');
            }}
            size="sm"
            className="h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 p-0"
            title="Scroll to bottom"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </Button>
        </div>
      )}

      {/* Enhanced Error Display */}
      {state.error && (
        <div 
          className="mx-6 mb-6 p-5 bg-destructive/5 border border-destructive/20 rounded-xl shadow-sm"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-destructive/10 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-destructive rounded-full"></div>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-destructive">Error</div>
              <div className="text-sm text-destructive/80 mt-1">{state.error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Input Area at Bottom */}
      <div className="flex-shrink-0">
        <ChatInput
          value={state.inputValue}
          onChange={actions.updateInputValue}
          onSend={handleSendMessage}
          onKeyPress={handleKeyPress}
          disabled={state.isLoading || aiWorkflow.state.isProcessing || !state.currentSession}
          placeholder="Ask about molecular structures, proteins, or bioinformatics..."
        />
      </div>
    </div>
  );
};

export default ChatInterface;