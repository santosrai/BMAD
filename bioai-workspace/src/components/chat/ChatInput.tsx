import React, { useRef, useEffect } from 'react';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="border-t border-gray-800 bg-gray-900 p-4">
      <div className="flex items-end gap-3 bg-gray-800 rounded-lg border border-gray-700 p-3 transition-all">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyPress={onKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            "min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent px-3 py-2 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm text-white",
            "placeholder:text-gray-400"
          )}
        />
        <Button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          size="icon"
          className="shrink-0 h-10 w-10 bg-blue-600 hover:bg-blue-700 border-0 text-white disabled:opacity-50"
          title="Send message (Enter)"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
      <div className="mt-2 text-center">
        <span className="text-xs text-gray-500">
          Press Enter to send, Shift+Enter for new line
        </span>
      </div>
    </div>
  );
};

export default ChatInput;