import React, { useState } from 'react';
import type { ChatSession } from '../../types/chat';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '@/lib/utils';
import { MessageCircle, Trash2, Plus, Search, X, Calendar, Hash } from 'lucide-react';
import '../../styles/chat.css';

interface ChatSessionListProps {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  onSessionSelect: (sessionId: string) => void;
  onSessionDelete: (sessionId: string) => void;
  onNewSession: () => void;
  isLoading: boolean;
}

const ChatSessionList: React.FC<ChatSessionListProps> = ({
  sessions,
  currentSession,
  onSessionSelect,
  onSessionDelete,
  onNewSession,
  isLoading
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'messages'>('recent');

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getFullDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString([], { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredAndSortedSessions = sessions
    .filter(session => {
      if (!searchTerm) return true;
      const title = session.title || `Chat ${session.id.slice(-8)}`;
      return title.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return a.updatedAt - b.updatedAt;
        case 'messages':
          return b.messageCount - a.messageCount;
        case 'recent':
        default:
          return b.updatedAt - a.updatedAt;
      }
    });

  return (
    <div className="chat-session-list absolute top-16 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
      {/* Header with Search and Controls */}
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Chat History ({sessions.length})
          </h3>
          <Button
            size="sm"
            onClick={onNewSession}
            disabled={isLoading}
            className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            New Chat
          </Button>
        </div>
        
        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-8 h-8 text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Sort Options */}
        <div className="flex gap-1">
          {[['recent', 'Recent'], ['oldest', 'Oldest'], ['messages', 'Most Active']].map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={sortBy === value ? "default" : "ghost"}
              onClick={() => setSortBy(value as any)}
              className="h-7 px-2 text-xs"
            >
              {value === 'recent' && <Calendar className="w-3 h-3 mr-1" />}
              {value === 'messages' && <Hash className="w-3 h-3 mr-1" />}
              {label}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Sessions List */}
      <div className="overflow-y-auto max-h-64">
        {filteredAndSortedSessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? (
              <>
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conversations found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </>
            ) : (
              <>
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No chat sessions yet</p>
                <p className="text-xs mt-1">Start a new conversation to begin</p>
              </>
            )}
          </div>
        ) : (
          <div className="p-2">
            {filteredAndSortedSessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "chat-session-item flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 mb-1",
                  "hover:bg-gray-50 hover:shadow-sm",
                  currentSession?.id === session.id
                    ? "active bg-primary/10 border border-primary/20 shadow-sm chat-session-pulse"
                    : "border border-transparent"
                )}
                onClick={() => onSessionSelect(session.id)}
                title={getFullDate(session.updatedAt)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      currentSession?.id === session.id ? "bg-primary" : "bg-gray-300"
                    )} />
                    <h4 className="chat-session-title text-sm font-medium text-gray-900 truncate">
                      {session.title || `Chat ${session.id.slice(-8)}`}
                    </h4>
                  </div>
                  <div className="chat-session-meta flex items-center gap-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(session.updatedAt)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      {session.messageCount}
                    </span>
                  </div>
                </div>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Delete this conversation? This action cannot be undone.')) {
                      onSessionDelete(session.id);
                    }
                  }}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Delete conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer with helpful tips */}
      {sessions.length > 0 && (
        <div className="p-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span>💡 Tip: Click to switch, search to find specific chats</span>
            <span>{filteredAndSortedSessions.length} of {sessions.length}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSessionList;