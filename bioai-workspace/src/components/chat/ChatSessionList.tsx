import React from 'react';
import type { ChatSession } from '../../types/chat';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { Plus, Trash2, MessageSquare } from 'lucide-react';

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
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="w-full h-full chat-glass border-r-0">
      <div className="flex items-center justify-between p-4 border-b">
        <h4 className="font-semibold text-foreground">Chat Sessions</h4>
        <Button
          size="sm"
          onClick={onNewSession}
          disabled={isLoading}
          className="h-8"
        >
          <Plus className="w-3 h-3 mr-1" />
          New Chat
        </Button>
      </div>
      
      <ScrollArea className="flex-1 p-2">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No chat sessions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "group relative p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent chat-hover-lift",
                  currentSession?.id === session.id 
                    ? "bg-accent border-accent-foreground/20 session-pulse" 
                    : "bg-card hover:shadow-sm"
                )}
                onClick={() => onSessionSelect(session.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground truncate mb-1">
                      {session.title}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDate(session.updatedAt)}</span>
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        {session.messageCount}
                      </Badge>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Are you sure you want to delete this session?')) {
                        onSessionDelete(session.id);
                      }
                    }}
                    disabled={isLoading}
                    title="Delete session"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ChatSessionList;