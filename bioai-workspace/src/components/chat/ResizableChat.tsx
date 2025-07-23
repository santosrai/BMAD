import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatInterface from './ChatInterface';
import { cn } from '@/lib/utils';
import { Move } from 'lucide-react';

interface ResizableChatProps {
  className?: string;
  onResize?: (width: number, height: number) => void;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

interface ResizeDirection {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

export const ResizableChat: React.FC<ResizableChatProps> = ({
  className = '',
  onResize,
  minWidth = 300,
  maxWidth = 800,
  minHeight = 400,
  maxHeight = 800
}) => {
  const [width, setWidth] = useState(400);
  const [height, setHeight] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection>({
    top: false,
    right: false,
    bottom: false,
    left: false
  });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });
  const [showResizeHint, setShowResizeHint] = useState(true);
  
  const chatRef = useRef<HTMLDivElement>(null);

  // Load saved size from localStorage
  useEffect(() => {
    const savedWidth = localStorage.getItem('chatWidth');
    const savedHeight = localStorage.getItem('chatHeight');
    
    if (savedWidth) {
      setWidth(parseInt(savedWidth));
    }
    if (savedHeight) {
      setHeight(parseInt(savedHeight));
    }
  }, []);

  // Hide resize hint after first resize
  useEffect(() => {
    if (isResizing) {
      setShowResizeHint(false);
    }
  }, [isResizing]);

  // Save size to localStorage
  const saveSize = useCallback((newWidth: number, newHeight: number) => {
    localStorage.setItem('chatWidth', newWidth.toString());
    localStorage.setItem('chatHeight', newHeight.toString());
  }, []);

  const handleMouseDown = (e: React.MouseEvent, direction: ResizeDirection) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeDirection(direction);
    setStartPos({ x: e.clientX, y: e.clientY });
    setStartSize({ width, height });
    
    document.body.style.cursor = getCursorStyle(direction);
    document.body.style.userSelect = 'none';
  };

  const getCursorStyle = (direction: ResizeDirection): string => {
    if (direction.top && direction.left) return 'nw-resize';
    if (direction.top && direction.right) return 'ne-resize';
    if (direction.bottom && direction.left) return 'sw-resize';
    if (direction.bottom && direction.right) return 'se-resize';
    if (direction.top || direction.bottom) return 'ns-resize';
    if (direction.left || direction.right) return 'ew-resize';
    return 'default';
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startPos.x;
    const deltaY = e.clientY - startPos.y;

    let newWidth = startSize.width;
    let newHeight = startSize.height;

    // Calculate new dimensions based on resize direction
    if (resizeDirection.left) {
      newWidth = Math.max(minWidth, Math.min(maxWidth, startSize.width - deltaX));
    }
    if (resizeDirection.right) {
      newWidth = Math.max(minWidth, Math.min(maxWidth, startSize.width + deltaX));
    }
    if (resizeDirection.top) {
      newHeight = Math.max(minHeight, Math.min(maxHeight, startSize.height - deltaY));
    }
    if (resizeDirection.bottom) {
      newHeight = Math.max(minHeight, Math.min(maxHeight, startSize.height + deltaY));
    }

    setWidth(newWidth);
    setHeight(newHeight);
    
    // Notify parent component of size change
    onResize?.(newWidth, newHeight);
  }, [isResizing, startPos, startSize, resizeDirection, minWidth, maxWidth, minHeight, maxHeight, onResize]);

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      setResizeDirection({ top: false, right: false, bottom: false, left: false });
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // Save the new size
      saveSize(width, height);
    }
  }, [isResizing, width, height, saveSize]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={chatRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        minWidth: `${minWidth}px`,
        minHeight: `${minHeight}px`,
        maxWidth: `${maxWidth}px`,
        maxHeight: `${maxHeight}px`
      }}
      className={cn(
        "relative bg-background border-2 border-gray-300 rounded-lg shadow-lg overflow-hidden",
        isResizing && "select-none",
        className
      )}
    >
      {/* Resize hint */}
      {showResizeHint && (
        <div className="absolute top-2 left-2 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium z-50 flex items-center gap-1 animate-pulse">
          <Move className="w-3 h-3" />
          Drag edges to resize
        </div>
      )}

      {/* Resize handles with better visibility */}
      {/* Top edge */}
      <div
        className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize bg-gradient-to-b from-blue-400/30 to-transparent hover:from-blue-500/50 hover:to-blue-300/20 transition-all duration-200 group"
        onMouseDown={(e) => handleMouseDown(e, { top: true, right: false, bottom: false, left: false })}
      >
        <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      
      {/* Right edge */}
      <div
        className="absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize bg-gradient-to-l from-blue-400/30 to-transparent hover:from-blue-500/50 hover:to-blue-300/20 transition-all duration-200 group"
        onMouseDown={(e) => handleMouseDown(e, { top: false, right: true, bottom: false, left: false })}
      >
        <div className="absolute top-1/2 right-1 transform translate-y-1/2 h-8 w-0.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      
      {/* Bottom edge */}
      <div
        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-gradient-to-t from-blue-400/30 to-transparent hover:from-blue-500/50 hover:to-blue-300/20 transition-all duration-200 group"
        onMouseDown={(e) => handleMouseDown(e, { top: false, right: false, bottom: true, left: false })}
      >
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      
      {/* Left edge */}
      <div
        className="absolute top-0 left-0 bottom-0 w-2 cursor-ew-resize bg-gradient-to-r from-blue-400/30 to-transparent hover:from-blue-500/50 hover:to-blue-300/20 transition-all duration-200 group"
        onMouseDown={(e) => handleMouseDown(e, { top: false, right: false, bottom: false, left: true })}
      >
        <div className="absolute top-1/2 left-1 transform -translate-y-1/2 h-8 w-0.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      
      {/* Corner handles */}
      {/* Top-left corner */}
      <div
        className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize bg-gradient-to-br from-blue-500/40 to-blue-300/20 hover:from-blue-600/60 hover:to-blue-400/40 transition-all duration-200 rounded-br-lg group"
        onMouseDown={(e) => handleMouseDown(e, { top: true, right: false, bottom: false, left: true })}
      >
        <div className="absolute top-1 left-1 w-2 h-2 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      
      {/* Top-right corner */}
      <div
        className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize bg-gradient-to-bl from-blue-500/40 to-blue-300/20 hover:from-blue-600/60 hover:to-blue-400/40 transition-all duration-200 rounded-bl-lg group"
        onMouseDown={(e) => handleMouseDown(e, { top: true, right: true, bottom: false, left: false })}
      >
        <div className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      
      {/* Bottom-left corner */}
      <div
        className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize bg-gradient-to-tr from-blue-500/40 to-blue-300/20 hover:from-blue-600/60 hover:to-blue-400/40 transition-all duration-200 rounded-tr-lg group"
        onMouseDown={(e) => handleMouseDown(e, { top: false, right: false, bottom: true, left: true })}
      >
        <div className="absolute bottom-1 left-1 w-2 h-2 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      
      {/* Bottom-right corner */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gradient-to-tl from-blue-500/40 to-blue-300/20 hover:from-blue-600/60 hover:to-blue-400/40 transition-all duration-200 rounded-tl-lg group"
        onMouseDown={(e) => handleMouseDown(e, { top: false, right: true, bottom: true, left: false })}
      >
        <div className="absolute bottom-1 right-1 w-2 h-2 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Resize indicator */}
      {isResizing && (
        <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium z-50">
          {width} × {height}
        </div>
      )}

      {/* Chat content */}
      <div className="w-full h-full">
        <ChatInterface />
      </div>
    </div>
  );
}; 