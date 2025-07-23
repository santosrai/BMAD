import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronsLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResizablePanelsProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  className?: string;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  defaultLeftWidth?: number;
}

export const ResizablePanels: React.FC<ResizablePanelsProps> = ({
  leftPanel,
  rightPanel,
  className = '',
  minLeftWidth = 300,
  maxLeftWidth = 600,
  defaultLeftWidth = 400
}) => {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);

  // Load saved width from localStorage
  useEffect(() => {
    const savedWidth = localStorage.getItem('leftPanelWidth');
    if (savedWidth) {
      const width = parseInt(savedWidth);
      if (width >= minLeftWidth && width <= maxLeftWidth) {
        setLeftWidth(width);
      }
    }
  }, [minLeftWidth, maxLeftWidth]);

  // Save width to localStorage
  const saveWidth = useCallback((width: number) => {
    localStorage.setItem('leftPanelWidth', width.toString());
  }, []);

  // Keyboard shortcuts for quick resizing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + [ for smaller
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'BracketLeft') {
        e.preventDefault();
        const newWidth = Math.max(minLeftWidth, leftWidth - 50);
        setLeftWidth(newWidth);
        saveWidth(newWidth);
      }
      
      // Ctrl/Cmd + Shift + ] for larger
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'BracketRight') {
        e.preventDefault();
        const newWidth = Math.min(maxLeftWidth, leftWidth + 50);
        setLeftWidth(newWidth);
        saveWidth(newWidth);
      }
      
      // Ctrl/Cmd + Shift + 0 to reset to default
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'Digit0') {
        e.preventDefault();
        setLeftWidth(defaultLeftWidth);
        saveWidth(defaultLeftWidth);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [leftWidth, minLeftWidth, maxLeftWidth, defaultLeftWidth, saveWidth]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(leftWidth);
    
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    // Add visual feedback
    document.body.classList.add('resize-active');
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Reset to default width on double-click
    setLeftWidth(defaultLeftWidth);
    saveWidth(defaultLeftWidth);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startX;
    const newWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, startWidth + deltaX));
    
    setLeftWidth(newWidth);
  }, [isResizing, startX, startWidth, minLeftWidth, maxLeftWidth]);

  // Touch handlers for mobile support
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    setIsResizing(true);
    setStartX(touch.clientX);
    setStartWidth(leftWidth);
    
    document.body.classList.add('resize-active');
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isResizing) return;
    e.preventDefault();

    const touch = e.touches[0];
    const deltaX = touch.clientX - startX;
    const newWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, startWidth + deltaX));
    
    setLeftWidth(newWidth);
  }, [isResizing, startX, startWidth, minLeftWidth, maxLeftWidth]);

  const handleTouchEnd = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      document.body.classList.remove('resize-active');
      saveWidth(leftWidth);
    }
  }, [isResizing, leftWidth, saveWidth]);

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.classList.remove('resize-active');
      
      // Save the new width
      saveWidth(leftWidth);
    }
  }, [isResizing, leftWidth, saveWidth]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isResizing, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-full w-full overflow-hidden",
        isResizing && "select-none",
        className
      )}
    >
      {/* Left Panel (Chat) */}
      <div
        style={{ width: `${leftWidth}px`, minWidth: `${minLeftWidth}px`, maxWidth: `${maxLeftWidth}px` }}
        className={cn(
          "flex-shrink-0 bg-background border-r border-border overflow-hidden transition-all duration-200",
          isResizing && "shadow-lg"
        )}
      >
        {leftPanel}
      </div>

      {/* Enhanced Resizable Divider */}
      <div
        ref={dividerRef}
        className={cn(
          "w-1 bg-border hover:bg-primary/30 cursor-col-resize transition-all duration-200 relative group flex items-center justify-center",
          isResizing && "bg-primary/50 shadow-sm"
        )}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        title="Drag to resize chat panel (Double-click to reset)"
      >
        {/* Always visible subtle divider line */}
        <div className="absolute inset-y-0 left-1/2 w-px bg-border group-hover:bg-primary/40 transition-colors" />
        
        {/* Divider Handle - More prominent and always slightly visible */}
        <div className={cn(
          "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
          "w-6 h-16 bg-background border border-border rounded-full shadow-sm",
          "flex items-center justify-center transition-all duration-200",
          "opacity-60 group-hover:opacity-100 group-hover:border-primary/40 group-hover:shadow-md group-hover:scale-110",
          isResizing && "opacity-100 border-primary/60 shadow-md scale-110"
        )}>
          <ChevronsLeftRight className={cn(
            "w-3 h-3 text-muted-foreground transition-colors",
            "group-hover:text-primary",
            isResizing && "text-primary"
          )} />
        </div>
        
        {/* Extended hover area for easier interaction */}
        <div className="absolute inset-0 w-6 -left-3 bg-transparent" />
        
        {/* Visual feedback during resize */}
        {isResizing && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-2 py-1 text-xs rounded shadow-lg pointer-events-none">
            {leftWidth}px
          </div>
        )}
      </div>

      {/* Right Panel (Search + Canvas) */}
      <div className={cn(
        "flex-1 bg-muted/30 min-w-0 transition-all duration-200",
        isResizing && "opacity-95"
      )}>
        {rightPanel}
      </div>
    </div>
  );
}; 