import React from 'react';
import type { ChatSession } from '../../types/chat';
import type { AIWorkflowHookState } from '../../types/aiWorkflow';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ExportButton } from '../export/ExportButton';
import { cn } from '@/lib/utils';
import { 
  Menu, 
  Layers, 
  Trash2, 
  Download, 
  AlertCircle, 
  Loader2, 
  MessageSquare 
} from 'lucide-react';

interface ChatHeaderProps {
  currentSession: ChatSession | null;
  onToggleSessions: () => void;
  onClearHistory: () => void;
  onExportChat: (format: 'json' | 'txt' | 'markdown') => string;
  isLoading: boolean;
  aiEnabled?: boolean;
  onToggleAI?: () => void;
  aiWorkflowState?: AIWorkflowHookState;
  onClearAIHistory?: () => void;
  onExportAIHistory?: (format: 'json' | 'csv' | 'markdown') => string;
  messages?: any[];
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  currentSession,
  onToggleSessions,
  onClearHistory,
  onExportChat,
  isLoading,
  aiEnabled = false,
  onToggleAI,
  aiWorkflowState,
  onClearAIHistory,
  onExportAIHistory,
  messages = []
}) => {
  const handleExport = (format: 'json' | 'txt' | 'markdown') => {
    const content = onExportChat(format);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${currentSession?.id || 'session'}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAIExport = (format: 'json' | 'csv' | 'markdown') => {
    if (!onExportAIHistory) return;
    
    const content = onExportAIHistory(format);
    const blob = new Blob([content], { 
      type: format === 'json' ? 'application/json' : 'text/plain' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-workflow-history-${currentSession?.id || 'session'}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900">
      {/* Left Section - Title and Session Info */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost"
          size="icon"
          onClick={onToggleSessions}
          title="Toggle sessions"
          className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <Menu className="w-4 h-4" />
        </Button>
        
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-white text-base">
            {currentSession?.title || 'BioAI Chat'}
          </h3>
          {currentSession && (
            <Badge variant="secondary" className="text-xs bg-gray-800 text-gray-300 border-gray-700">
              <MessageSquare className="w-3 h-3 mr-1" />
              {currentSession.messageCount}
            </Badge>
          )}
        </div>
      </div>
      
      {/* Right Section - Controls */}
      <div className="flex items-center gap-3">
        {/* AI Section - Grouped */}
        {onToggleAI && (
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-lg border border-gray-700">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleAI}
              disabled={isLoading}
              title={aiEnabled ? 'Disable AI processing' : 'Enable AI processing'}
              className={cn(
                "h-7 px-2 text-xs",
                aiEnabled 
                  ? "bg-blue-600 hover:bg-blue-700 text-white" 
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              )}
            >
              <Layers className="w-3 h-3 mr-1" />
              AI {aiEnabled ? 'On' : 'Off'}
            </Button>
            
            {/* AI Status Indicators */}
            {aiEnabled && aiWorkflowState && (
              <div className="flex items-center gap-1">
                {aiWorkflowState.isProcessing && (
                  <Badge variant="secondary" className="text-xs bg-blue-900 text-blue-300">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Processing
                  </Badge>
                )}
                {aiWorkflowState.error && (
                  <Badge variant="destructive" className="text-xs" title={aiWorkflowState.error}>
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Error
                  </Badge>
                )}
                {aiWorkflowState.workflowHistory.length > 0 && (
                  <Badge variant="outline" className="text-xs bg-gray-700 text-gray-300 border-gray-600">
                    {aiWorkflowState.workflowHistory.length} workflows
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Action Buttons - Grouped */}
        <div className="flex items-center gap-1 px-2 py-1 bg-gray-800 rounded-lg border border-gray-700">
          {/* AI History Clear */}
          {onClearAIHistory && aiEnabled && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearAIHistory}
              disabled={isLoading || !aiWorkflowState || aiWorkflowState.workflowHistory.length === 0}
              title="Clear AI workflow history"
              className="h-7 w-7 text-gray-400 hover:text-white hover:bg-gray-700"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearHistory}
            disabled={isLoading || !currentSession}
            title="Clear chat history"
            className="h-7 w-7 text-gray-400 hover:text-white hover:bg-gray-700"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
            
          <ExportButton
            type="conversation"
            data={messages}
            label="Export"
            disabled={isLoading || !currentSession || messages.length === 0}
            className="h-7 w-7 text-gray-400 hover:text-white hover:bg-gray-700"
          />
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;