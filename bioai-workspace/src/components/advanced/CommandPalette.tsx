import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { keyboardShortcutManager } from '../../utils/keyboardShortcuts';
import { CommandPaletteItem } from '../../types/advanced';
import { Search, Command, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  context?: string;
}

export function CommandPalette({ isOpen, onClose, context = 'global' }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [filteredCommands, setFilteredCommands] = useState<CommandPaletteItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim()) {
      const results = keyboardShortcutManager.searchCommands(query);
      setFilteredCommands(results);
    } else {
      const contextCommands = keyboardShortcutManager.getCommandsByContext(context);
      setFilteredCommands(contextCommands.slice(0, 10));
    }
    setSelectedIndex(0);
  }, [query, context]);

  useEffect(() => {
    const allCommands = keyboardShortcutManager.getAllCommands();
    const uniqueCategories = [...new Set(allCommands.map(cmd => cmd.category))];
    setCategories(uniqueCategories);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  const executeCommand = async (command: CommandPaletteItem) => {
    try {
      await command.action();
      onClose();
    } catch (error) {
      console.error('Command execution failed:', error);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'AI': 'bg-blue-100 text-blue-800',
      'Files': 'bg-green-100 text-green-800',
      'Export': 'bg-purple-100 text-purple-800',
      'Settings': 'bg-orange-100 text-orange-800',
      'Advanced': 'bg-red-100 text-red-800',
      'Search': 'bg-yellow-100 text-yellow-800',
      'Help': 'bg-gray-100 text-gray-800',
      'Workspace': 'bg-indigo-100 text-indigo-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getShortcutForCommand = (command: CommandPaletteItem) => {
    // Find corresponding shortcut
    const shortcuts = keyboardShortcutManager.getAllShortcuts();
    const shortcut = shortcuts.find(s => s.action === command.action.toString());
    return shortcut ? keyboardShortcutManager.getShortcutString(shortcut) : null;
  };

  const groupedCommands = React.useMemo(() => {
    const grouped: Record<string, CommandPaletteItem[]> = {};
    
    filteredCommands.forEach(command => {
      if (!grouped[command.category]) {
        grouped[command.category] = [];
      }
      grouped[command.category].push(command);
    });

    return grouped;
  }, [filteredCommands]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
      <Card className="w-full max-w-2xl bg-white shadow-xl border-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b">
          <Command className="h-5 w-5 text-gray-400" />
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or search..."
              className="w-full text-lg bg-transparent border-none outline-none placeholder-gray-400"
            />
          </div>
          <Badge variant="outline" className="text-xs">
            {filteredCommands.length} commands
          </Badge>
        </div>

        {/* Commands List */}
        <div className="max-h-96 overflow-y-auto">
          {Object.keys(groupedCommands).length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No commands found</p>
              <p className="text-sm mt-1">Try searching for something else</p>
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, commands]) => (
              <div key={category} className="p-2">
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
                  <Badge className={getCategoryColor(category)} variant="outline">
                    {category}
                  </Badge>
                  <span className="text-gray-400">({commands.length})</span>
                </div>
                <div className="space-y-1">
                  {commands.map((command, index) => {
                    const globalIndex = filteredCommands.indexOf(command);
                    const isSelected = globalIndex === selectedIndex;
                    const shortcut = getShortcutForCommand(command);

                    return (
                      <button
                        key={command.id}
                        onClick={() => executeCommand(command)}
                        className={`
                          w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors
                          ${isSelected 
                            ? 'bg-blue-50 border-blue-200 border' 
                            : 'hover:bg-gray-50 border border-transparent'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-lg">{command.icon}</span>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {command.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {command.description}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {shortcut && (
                            <Badge variant="outline" className="text-xs font-mono">
                              {shortcut}
                            </Badge>
                          )}
                          {isSelected && (
                            <div className="flex items-center gap-1 text-xs text-blue-600">
                              <CornerDownLeft className="h-3 w-3" />
                              <span>Execute</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t bg-gray-50 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <ArrowUp className="h-3 w-3" />
              <ArrowDown className="h-3 w-3" />
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" />
              <span>Execute</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">ESC</Badge>
              <span>Close</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Command className="h-3 w-3" />
            <span>Command Palette</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleShortcut = (e: CustomEvent<{ action: string }>) => {
      if (e.detail.action === 'openCommandPalette') {
        setIsOpen(true);
      }
    };

    document.addEventListener('shortcut-action', handleShortcut as EventListener);
    return () => document.removeEventListener('shortcut-action', handleShortcut as EventListener);
  }, []);

  const openCommandPalette = () => setIsOpen(true);
  const closeCommandPalette = () => setIsOpen(false);

  return {
    isOpen,
    openCommandPalette,
    closeCommandPalette
  };
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [shortcuts, setShortcuts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const allShortcuts = keyboardShortcutManager.getAllShortcuts();
    const uniqueCategories = [...new Set(allShortcuts.map(s => s.category))];
    setCategories(['all', ...uniqueCategories]);
    setShortcuts(allShortcuts);
  }, []);

  const filteredShortcuts = shortcuts.filter(shortcut => 
    selectedCategory === 'all' || shortcut.category === selectedCategory
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl bg-white shadow-xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
          <Button variant="ghost" onClick={onClose}>×</Button>
        </div>

        <div className="flex">
          {/* Category Sidebar */}
          <div className="w-48 border-r bg-gray-50 p-4">
            <h3 className="font-medium mb-3">Categories</h3>
            <div className="space-y-1">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`
                    w-full text-left px-3 py-2 rounded capitalize transition-colors
                    ${selectedCategory === category 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'hover:bg-gray-100'
                    }
                  `}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Shortcuts List */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              {filteredShortcuts.map(shortcut => (
                <div key={shortcut.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <h4 className="font-medium">{shortcut.name}</h4>
                    <p className="text-sm text-gray-600">{shortcut.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {shortcut.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {shortcut.context}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="font-mono">
                      {keyboardShortcutManager.getShortcutString(shortcut)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}