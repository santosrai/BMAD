import React, { useRef, useEffect } from 'react';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import '../../styles/chat.css';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (content: string) => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled: boolean;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onKeyPress,
  disabled,
  placeholder = 'Type your message...'
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend(value);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="border-t border-border bg-background p-6">
      {/* Enhanced input container with light gray background */}
      <div className={cn(
        "chat-input-container flex items-end gap-4 bg-white rounded-2xl border border-gray-200 p-5 transition-all duration-200 shadow-sm",
        "chat-input-glow focus-within:border-gray-300 focus-within:shadow-md focus-within:bg-white",
        "hover:border-gray-300"
      )}>
        <div className="flex-1 space-y-1">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyPress={onKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              "chat-input-textarea min-h-[48px] max-h-[120px] resize-none border-0 bg-transparent px-0 py-2",
              "focus-visible:ring-0 focus-visible:ring-offset-0 text-sm text-gray-800",
              "placeholder:text-gray-500 placeholder:text-sm placeholder:font-normal",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "leading-relaxed"
            )}
          />
        </div>
        
        {/* Enhanced send button */}
        <Button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          size="icon"
          className={cn(
            "chat-btn-press shrink-0 h-11 w-11 bg-primary hover:bg-primary/90 border-0 text-primary-foreground",
            "shadow-sm hover:shadow-md transition-all duration-200",
            "disabled:opacity-30 disabled:cursor-not-allowed",
            "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          )}
          title="Send message (Enter)"
        >
          <Send className={cn(
            "w-4 h-4 transition-transform duration-200",
            !disabled && value.trim() && "hover:scale-110"
          )} />
        </Button>
      </div>
      
      {/* Instructions with better styling */}
      <div className="mt-3 flex justify-center">
        <span className="text-xs text-muted-foreground/60 bg-muted/30 px-3 py-1 rounded-full border border-border/50">
          Press <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs font-medium">Enter</kbd> to send, 
          <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs font-medium">Shift+Enter</kbd> for new line
        </span>
      </div>
    </div>
  );
};

export default ChatInput;