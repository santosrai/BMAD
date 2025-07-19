import type { ChatMessage, ChatFormatOptions } from '../types/chat';

export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return new Date(timestamp).toLocaleDateString();
  }
};

export const formatTimestamp = (timestamp: number, format: 'iso' | 'relative' | 'full' = 'relative'): string => {
  const date = new Date(timestamp);
  
  switch (format) {
    case 'iso':
      return date.toISOString();
    case 'full':
      return date.toLocaleString();
    case 'relative':
    default:
      return formatRelativeTime(timestamp);
  }
};

export const formatMessageContent = (content: string): string => {
  // Basic markdown-like formatting
  let formatted = content
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic text
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Line breaks
    .replace(/\n/g, '<br>');

  return formatted;
};

export const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};

export const truncateMessage = (content: string, maxLength: number = 100): string => {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
};

export const exportMessagesToJson = (messages: ChatMessage[], options: ChatFormatOptions = {
  includeTimestamps: true,
  includeMetadata: true,
  dateFormat: 'iso'
}): string => {
  const formattedMessages = messages.map(message => ({
    id: message.id,
    content: message.content,
    type: message.type,
    status: message.status,
    ...(options.includeTimestamps && {
      timestamp: options.dateFormat === 'iso' 
        ? new Date(message.timestamp).toISOString()
        : formatTimestamp(message.timestamp, options.dateFormat)
    }),
    ...(options.includeMetadata && message.metadata && {
      metadata: message.metadata
    })
  }));

  return JSON.stringify(formattedMessages, null, 2);
};

export const exportMessagesToText = (messages: ChatMessage[], options: ChatFormatOptions = {
  includeTimestamps: true,
  includeMetadata: false,
  dateFormat: 'full'
}): string => {
  return messages.map(message => {
    const timestamp = options.includeTimestamps 
      ? `[${formatTimestamp(message.timestamp, options.dateFormat)}] `
      : '';
    
    const sender = message.type === 'user' ? 'You' : 
                   message.type === 'assistant' ? 'Assistant' : 
                   'System';
    
    const metadata = options.includeMetadata && message.metadata 
      ? `\n  Processing time: ${message.metadata.processingTime || 'N/A'}ms\n  Tokens: ${message.metadata.tokenCount || 'N/A'}`
      : '';
    
    return `${timestamp}${sender}: ${message.content}${metadata}`;
  }).join('\n\n');
};

export const exportMessagesToMarkdown = (messages: ChatMessage[], options: ChatFormatOptions = {
  includeTimestamps: true,
  includeMetadata: true,
  dateFormat: 'full'
}): string => {
  return messages.map(message => {
    const timestamp = options.includeTimestamps 
      ? `*${formatTimestamp(message.timestamp, options.dateFormat)}*\n\n`
      : '';
    
    const sender = message.type === 'user' ? '👤 **You**' : 
                   message.type === 'assistant' ? '🤖 **Assistant**' : 
                   '⚙️ **System**';
    
    const metadata = options.includeMetadata && message.metadata 
      ? `\n\n> Processing time: ${message.metadata.processingTime || 'N/A'}ms  \n> Tokens: ${message.metadata.tokenCount || 'N/A'}`
      : '';
    
    return `## ${sender}\n\n${timestamp}${message.content}${metadata}`;
  }).join('\n\n---\n\n');
};

export const searchMessages = (messages: ChatMessage[], query: string): ChatMessage[] => {
  const lowercaseQuery = query.toLowerCase();
  return messages.filter(message => 
    message.content.toLowerCase().includes(lowercaseQuery)
  );
};

export const getMessageStatistics = (messages: ChatMessage[]) => {
  const userMessages = messages.filter(m => m.type === 'user');
  const assistantMessages = messages.filter(m => m.type === 'assistant');
  const systemMessages = messages.filter(m => m.type === 'system');
  
  const totalTokens = messages.reduce((sum, message) => 
    sum + (message.metadata?.tokenCount || 0), 0
  );
  
  const averageProcessingTime = assistantMessages.length > 0 
    ? assistantMessages.reduce((sum, message) => 
        sum + (message.metadata?.processingTime || 0), 0
      ) / assistantMessages.length
    : 0;
  
  return {
    total: messages.length,
    userMessages: userMessages.length,
    assistantMessages: assistantMessages.length,
    systemMessages: systemMessages.length,
    totalTokens,
    averageProcessingTime: Math.round(averageProcessingTime)
  };
};

export const validateMessage = (content: string): { isValid: boolean; error?: string } => {
  if (!content.trim()) {
    return { isValid: false, error: 'Message cannot be empty' };
  }
  
  if (content.length > 4000) {
    return { isValid: false, error: 'Message is too long (max 4000 characters)' };
  }
  
  // Check for potentially problematic content
  const suspiciousPatterns = [
    /javascript:/i,
    /<script/i,
    /onclick=/i,
    /onload=/i
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      return { isValid: false, error: 'Message contains potentially unsafe content' };
    }
  }
  
  return { isValid: true };
};

export const generateSessionTitle = (firstMessage: string): string => {
  const cleaned = firstMessage.trim().replace(/\s+/g, ' ');
  const maxLength = 50;
  
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  
  // Try to find a natural break point
  const truncated = cleaned.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
};