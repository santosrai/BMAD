import React from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { cn } from '@/lib/utils';
import { Bot } from 'lucide-react';

interface TypingIndicatorProps {
  className?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ className = '' }) => {
  return (
    <div className={cn(
      "flex flex-col mb-8 message-enter max-w-[80%] items-start",
      className
    )}>
        <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
          <Avatar className="w-6 h-6 shrink-0 bg-blue-600">
            <AvatarFallback className="text-white text-xs font-medium bg-blue-600">
              <Bot className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">BioAI</span>
        </div>
        
        <div className="relative px-6 py-4 rounded-2xl shadow-sm bg-gray-50 border border-gray-200 typing-bubble">
          <div className="flex items-center justify-center min-w-[80px] h-6">
            <div className="typing-dots-pulse">
              <div className="typing-dot-pulse"></div>
              <div className="typing-dot-pulse"></div>
              <div className="typing-dot-pulse"></div>
            </div>
          </div>
        </div>
        
        {/* Timestamp under bubble */}
        <div className="mt-1 text-xs text-gray-400 text-left">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
    </div>
  );
};

export default TypingIndicator;