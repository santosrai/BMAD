import React from 'react';
import type { ChatMessage as ChatMessageType } from '../../types/chat';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { User, Bot, Settings, RotateCcw } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
  onRetry: () => void;
  isLoading: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onRetry, isLoading }) => {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageIcon = (type: ChatMessageType['type']) => {
    switch (type) {
      case 'user':
        return <User className="w-4 h-4" />;
      case 'assistant':
        return <Bot className="w-4 h-4" />;
      case 'system':
        return <Settings className="w-4 h-4" />;
      default:
        return <Bot className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: ChatMessageType['status']) => {
    switch (status) {
      case 'sending':
        return <Badge variant="secondary" className="text-xs">Sending</Badge>;
      case 'sent':
        return <Badge variant="outline" className="text-xs">✓</Badge>;
      case 'error':
        return <Badge variant="destructive" className="text-xs">Error</Badge>;
      default:
        return null;
    }
  };

  const isUser = message.type === 'user';
  const isAssistant = message.type === 'assistant';
  const isSystem = message.type === 'system';

  return (
    <div className={cn(
      "flex flex-col mb-8 message-enter max-w-[80%]",
      isUser && "items-end ml-auto",
      isAssistant && "items-start",
      isSystem && "items-center max-w-full mx-auto"
    )}>
        <div className={cn(
          "flex items-center gap-2 mb-3 text-xs text-gray-500",
          isUser && "flex-row-reverse"
        )}>
          {!isSystem && (
            <Avatar className={cn(
              "w-6 h-6 shrink-0",
              isAssistant && "bg-blue-600",
              isUser && "bg-blue-600"
            )}>
              <AvatarFallback className={cn(
                "text-white text-xs font-medium",
                isUser && "bg-blue-600",
                isAssistant && "bg-blue-600"
              )}>
                {getMessageIcon(message.type)}
              </AvatarFallback>
            </Avatar>
          )}
          <span className="font-medium">
            {message.type === 'user' ? 'You' : message.type === 'assistant' ? 'BioAI' : 'System'}
          </span>
          {getStatusBadge(message.status)}
        </div>
        
        <div className={cn(
          "relative px-6 py-4 rounded-2xl shadow-sm",
          isUser && "bg-primary text-primary-foreground",
          isAssistant && "bg-gray-50 text-gray-800 border border-gray-200",
          isSystem && "bg-destructive/10 text-destructive border border-destructive/20"
        )}>
          <div className="text-sm leading-relaxed space-y-2">
            {message.content.split('\n').map((line, index) => (
              <p key={index} className="m-0 leading-6">
                {line || '\u00A0'}
              </p>
            ))}
          </div>
        </div>
        
        {/* Timestamp under bubble */}
        <div className={cn(
          "mt-1 text-xs text-gray-400",
          isUser && "text-right",
          !isUser && "text-left"
        )}>
          {formatTime(message.timestamp)}
        </div>
        
        {message.status === 'error' && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
            <div className="flex items-center justify-between text-sm">
              <span className="text-destructive">
                {message.metadata?.error || 'Failed to send message'}
              </span>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={onRetry}
                disabled={isLoading}
                className="h-8 px-3"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        )}
    </div>
  );
};

export default ChatMessage;