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
      "flex gap-3 mb-6 message-enter",
      isUser && "flex-row-reverse",
      isSystem && "justify-center"
    )}>
      {!isSystem && (
        <Avatar className={cn(
          "w-8 h-8 shrink-0 mt-1",
          isAssistant && "bg-blue-600"
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
      
      <div className={cn(
        "flex flex-col max-w-[80%]",
        isUser && "items-end",
        isSystem && "items-center max-w-full"
      )}>
        <div className={cn(
          "flex items-center gap-2 mb-1 text-xs text-gray-500",
          isUser && "flex-row-reverse"
        )}>
          <span className="font-medium">
            {message.type === 'user' ? 'You' : message.type === 'assistant' ? 'BioAI' : 'System'}
          </span>
          <span>{formatTime(message.timestamp)}</span>
          {getStatusBadge(message.status)}
        </div>
        
        <div className={cn(
          "relative px-4 py-3 rounded-2xl max-w-full",
          isUser && "bg-blue-600 text-white ml-auto",
          isAssistant && "bg-gray-800 text-gray-100 border border-gray-700",
          isSystem && "bg-yellow-900/20 text-yellow-200 border border-yellow-700"
        )}>
          <div className="text-sm leading-relaxed">
            {message.content.split('\n').map((line, index) => (
              <p key={index} className="m-0">
                {line || '\u00A0'}
              </p>
            ))}
          </div>
        </div>
      
        {message.status === 'error' && (
          <div className="mt-2 p-2 bg-red-900/30 border border-red-700 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-red-300">
                {message.metadata?.error || 'Failed to send message'}
              </span>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={onRetry}
                disabled={isLoading}
                className="h-7 px-2 bg-red-600 hover:bg-red-700"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        )}
      
        {message.metadata && (message.metadata.processingTime || message.metadata.tokenCount) && (
          <div className="flex gap-2 mt-2 text-xs">
            {message.metadata.processingTime && (
              <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                ⚡ {message.metadata.processingTime}ms
              </Badge>
            )}
            {message.metadata.tokenCount && (
              <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                🔤 {message.metadata.tokenCount} tokens
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;