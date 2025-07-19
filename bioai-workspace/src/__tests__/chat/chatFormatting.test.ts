import { describe, it, expect } from 'vitest';
import { 
  formatRelativeTime, 
  validateMessage, 
  generateSessionTitle,
  exportMessagesToText,
  exportMessagesToJson,
  getMessageStatistics
} from '../../utils/chatFormatting';
import type { ChatMessage } from '../../types/chat';

describe('Chat Formatting Utilities', () => {
  describe('formatRelativeTime', () => {
    it('should format recent timestamps correctly', () => {
      const now = Date.now();
      
      expect(formatRelativeTime(now - 30000)).toBe('just now'); // 30 seconds ago
      expect(formatRelativeTime(now - 120000)).toBe('2m ago'); // 2 minutes ago
      expect(formatRelativeTime(now - 3600000)).toBe('1h ago'); // 1 hour ago
      expect(formatRelativeTime(now - 86400000)).toBe('1d ago'); // 1 day ago
    });
  });

  describe('validateMessage', () => {
    it('should validate correct messages', () => {
      const result = validateMessage('Hello, this is a valid message');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty messages', () => {
      const result = validateMessage('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message cannot be empty');
    });

    it('should reject messages that are too long', () => {
      const longMessage = 'a'.repeat(4001);
      const result = validateMessage(longMessage);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message is too long (max 4000 characters)');
    });

    it('should reject potentially unsafe content', () => {
      const unsafeMessage = '<script>alert("xss")</script>';
      const result = validateMessage(unsafeMessage);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message contains potentially unsafe content');
    });
  });

  describe('generateSessionTitle', () => {
    it('should generate title from short messages', () => {
      const message = 'Hello world';
      const title = generateSessionTitle(message);
      expect(title).toBe('Hello world');
    });

    it('should truncate long messages', () => {
      const longMessage = 'This is a very long message that should be truncated because it exceeds the maximum length';
      const title = generateSessionTitle(longMessage);
      expect(title.length).toBeLessThanOrEqual(53); // 50 + '...'
      expect(title.endsWith('...')).toBe(true);
    });

    it('should find natural break points', () => {
      const message = 'This is a message with multiple words that should break naturally';
      const title = generateSessionTitle(message);
      expect(title.includes(' ')).toBe(true); // Should contain spaces (natural breaks)
    });
  });

  describe('exportMessagesToText', () => {
    const mockMessages: ChatMessage[] = [
      {
        id: '1',
        content: 'Hello',
        timestamp: 1640995200000, // 2022-01-01 00:00:00
        userId: 'user1',
        sessionId: 'session1',
        type: 'user',
        status: 'sent'
      },
      {
        id: '2',
        content: 'Hi there!',
        timestamp: 1640995260000, // 2022-01-01 00:01:00
        userId: 'assistant',
        sessionId: 'session1',
        type: 'assistant',
        status: 'sent'
      }
    ];

    it('should export messages to text format', () => {
      const exported = exportMessagesToText(mockMessages);
      expect(exported).toContain('You: Hello');
      expect(exported).toContain('Assistant: Hi there!');
    });

    it('should include timestamps when requested', () => {
      const exported = exportMessagesToText(mockMessages, {
        includeTimestamps: true,
        includeMetadata: false,
        dateFormat: 'full'
      });
      expect(exported).toContain('[');
      expect(exported).toContain(']');
    });
  });

  describe('exportMessagesToJson', () => {
    const mockMessages: ChatMessage[] = [
      {
        id: '1',
        content: 'Test message',
        timestamp: 1640995200000,
        userId: 'user1',
        sessionId: 'session1',
        type: 'user',
        status: 'sent'
      }
    ];

    it('should export messages to valid JSON', () => {
      const exported = exportMessagesToJson(mockMessages);
      expect(() => JSON.parse(exported)).not.toThrow();
      
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0]).toHaveProperty('content', 'Test message');
    });
  });

  describe('getMessageStatistics', () => {
    const mockMessages: ChatMessage[] = [
      {
        id: '1',
        content: 'User message 1',
        timestamp: Date.now(),
        userId: 'user1',
        sessionId: 'session1',
        type: 'user',
        status: 'sent'
      },
      {
        id: '2',
        content: 'Assistant response',
        timestamp: Date.now(),
        userId: 'assistant',
        sessionId: 'session1',
        type: 'assistant',
        status: 'sent',
        metadata: {
          processingTime: 1500,
          tokenCount: 50
        }
      },
      {
        id: '3',
        content: 'User message 2',
        timestamp: Date.now(),
        userId: 'user1',
        sessionId: 'session1',
        type: 'user',
        status: 'sent'
      }
    ];

    it('should calculate message statistics correctly', () => {
      const stats = getMessageStatistics(mockMessages);
      
      expect(stats.total).toBe(3);
      expect(stats.userMessages).toBe(2);
      expect(stats.assistantMessages).toBe(1);
      expect(stats.systemMessages).toBe(0);
      expect(stats.totalTokens).toBe(50);
      expect(stats.averageProcessingTime).toBe(1500);
    });
  });
});