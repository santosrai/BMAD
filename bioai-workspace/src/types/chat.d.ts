export interface ChatMessage {
  id: string;
  content: string;
  timestamp: number;
  userId: string;
  sessionId: string;
  type: 'user' | 'assistant' | 'system';
  status: 'sending' | 'sent' | 'error';
  metadata?: {
    error?: string;
    processingTime?: number;
    tokenCount?: number;
  };
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  isActive: boolean;
}

export interface ChatState {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  inputValue: string;
  isTyping: boolean;
}

export interface ChatHookReturn {
  state: ChatState;
  actions: {
    sendMessage: (content: string) => Promise<void>;
    createSession: (title?: string) => Promise<ChatSession>;
    switchSession: (sessionId: string) => Promise<void>;
    clearHistory: () => Promise<void>;
    deleteSession: (sessionId: string) => Promise<void>;
    updateInputValue: (value: string) => void;
    exportChat: (format: 'json' | 'txt' | 'markdown') => string;
    retryMessage: (messageId: string) => Promise<void>;
  };
}

export interface ChatMessageInput {
  content: string;
  sessionId: string;
  type: 'user' | 'assistant' | 'system';
}

export interface ChatFormatOptions {
  includeTimestamps: boolean;
  includeMetadata: boolean;
  dateFormat: 'iso' | 'relative' | 'full';
}