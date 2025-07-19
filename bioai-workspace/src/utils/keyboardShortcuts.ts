import { KeyboardShortcut, CommandPaletteItem } from '../types/advanced';

export class KeyboardShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private commands: Map<string, CommandPaletteItem> = new Map();
  private listeners: Map<string, (event: KeyboardEvent) => void> = new Map();
  private isListening = false;

  constructor() {
    this.initializeDefaultShortcuts();
    this.initializeDefaultCommands();
  }

  private initializeDefaultShortcuts() {
    const defaultShortcuts: KeyboardShortcut[] = [
      // Global Navigation
      {
        id: 'open-command-palette',
        name: 'Open Command Palette',
        description: 'Open the command palette for quick actions',
        category: 'navigation',
        keys: ['k'],
        modifiers: ['ctrl'],
        action: 'openCommandPalette',
        context: 'global',
        enabled: true,
        customizable: true
      },
      {
        id: 'toggle-sidebar',
        name: 'Toggle Sidebar',
        description: 'Show/hide the sidebar',
        category: 'navigation',
        keys: ['\\'],
        modifiers: ['ctrl'],
        action: 'toggleSidebar',
        context: 'global',
        enabled: true,
        customizable: true
      },
      {
        id: 'focus-search',
        name: 'Focus Search',
        description: 'Focus the search input',
        category: 'navigation',
        keys: ['/'],
        modifiers: ['ctrl'],
        action: 'focusSearch',
        context: 'global',
        enabled: true,
        customizable: true
      },
      {
        id: 'go-to-workspace',
        name: 'Go to Workspace',
        description: 'Navigate to workspace',
        category: 'navigation',
        keys: ['w'],
        modifiers: ['ctrl'],
        action: 'goToWorkspace',
        context: 'global',
        enabled: true,
        customizable: true
      },
      {
        id: 'go-to-settings',
        name: 'Go to Settings',
        description: 'Navigate to settings',
        category: 'navigation',
        keys: [','],
        modifiers: ['ctrl'],
        action: 'goToSettings',
        context: 'global',
        enabled: true,
        customizable: true
      },

      // Chat Actions
      {
        id: 'new-chat',
        name: 'New Chat',
        description: 'Start a new chat session',
        category: 'ai',
        keys: ['n'],
        modifiers: ['ctrl'],
        action: 'newChat',
        context: 'chat',
        enabled: true,
        customizable: true
      },
      {
        id: 'clear-chat',
        name: 'Clear Chat',
        description: 'Clear current chat session',
        category: 'ai',
        keys: ['l'],
        modifiers: ['ctrl'],
        action: 'clearChat',
        context: 'chat',
        enabled: true,
        customizable: true
      },
      {
        id: 'export-chat',
        name: 'Export Chat',
        description: 'Export current chat session',
        category: 'ai',
        keys: ['e'],
        modifiers: ['ctrl'],
        action: 'exportChat',
        context: 'chat',
        enabled: true,
        customizable: true
      },
      {
        id: 'switch-model',
        name: 'Switch AI Model',
        description: 'Open model switching dialog',
        category: 'ai',
        keys: ['m'],
        modifiers: ['ctrl'],
        action: 'switchModel',
        context: 'chat',
        enabled: true,
        customizable: true
      },
      {
        id: 'toggle-ai',
        name: 'Toggle AI',
        description: 'Enable/disable AI processing',
        category: 'ai',
        keys: ['t'],
        modifiers: ['ctrl'],
        action: 'toggleAI',
        context: 'chat',
        enabled: true,
        customizable: true
      },

      // File Operations
      {
        id: 'upload-file',
        name: 'Upload File',
        description: 'Upload a new file',
        category: 'files',
        keys: ['u'],
        modifiers: ['ctrl'],
        action: 'uploadFile',
        context: 'global',
        enabled: true,
        customizable: true
      },
      {
        id: 'quick-open',
        name: 'Quick Open',
        description: 'Quick open file dialog',
        category: 'files',
        keys: ['o'],
        modifiers: ['ctrl'],
        action: 'quickOpen',
        context: 'global',
        enabled: true,
        customizable: true
      },
      {
        id: 'save-session',
        name: 'Save Session',
        description: 'Save current session',
        category: 'files',
        keys: ['s'],
        modifiers: ['ctrl'],
        action: 'saveSession',
        context: 'global',
        enabled: true,
        customizable: true
      },

      // Viewer Controls
      {
        id: 'reset-view',
        name: 'Reset View',
        description: 'Reset molecular viewer to default position',
        category: 'viewer',
        keys: ['r'],
        modifiers: ['ctrl'],
        action: 'resetView',
        context: 'viewer',
        enabled: true,
        customizable: true
      },
      {
        id: 'toggle-fullscreen',
        name: 'Toggle Fullscreen',
        description: 'Toggle fullscreen mode',
        category: 'viewer',
        keys: ['f'],
        modifiers: ['ctrl'],
        action: 'toggleFullscreen',
        context: 'viewer',
        enabled: true,
        customizable: true
      },
      {
        id: 'export-image',
        name: 'Export Image',
        description: 'Export current view as image',
        category: 'viewer',
        keys: ['i'],
        modifiers: ['ctrl'],
        action: 'exportImage',
        context: 'viewer',
        enabled: true,
        customizable: true
      },
      {
        id: 'export-pdb',
        name: 'Export PDB',
        description: 'Export current structure as PDB',
        category: 'viewer',
        keys: ['p'],
        modifiers: ['ctrl'],
        action: 'exportPDB',
        context: 'viewer',
        enabled: true,
        customizable: true
      },

      // Advanced Features
      {
        id: 'performance-monitor',
        name: 'Performance Monitor',
        description: 'Open performance monitoring dashboard',
        category: 'advanced',
        keys: ['p'],
        modifiers: ['ctrl', 'shift'],
        action: 'openPerformanceMonitor',
        context: 'global',
        enabled: true,
        customizable: true
      },
      {
        id: 'developer-tools',
        name: 'Developer Tools',
        description: 'Open developer tools',
        category: 'advanced',
        keys: ['d'],
        modifiers: ['ctrl', 'shift'],
        action: 'openDeveloperTools',
        context: 'global',
        enabled: true,
        customizable: true
      },

      // General
      {
        id: 'help',
        name: 'Help',
        description: 'Show help and keyboard shortcuts',
        category: 'general',
        keys: ['?'],
        modifiers: ['shift'],
        action: 'showHelp',
        context: 'global',
        enabled: true,
        customizable: true
      },
      {
        id: 'refresh',
        name: 'Refresh',
        description: 'Refresh the current page',
        category: 'general',
        keys: ['F5'],
        modifiers: [],
        action: 'refresh',
        context: 'global',
        enabled: true,
        customizable: true
      }
    ];

    defaultShortcuts.forEach(shortcut => {
      this.shortcuts.set(shortcut.id, shortcut);
    });
  }

  private initializeDefaultCommands() {
    const defaultCommands: CommandPaletteItem[] = [
      {
        id: 'new-chat-session',
        name: 'New Chat Session',
        description: 'Start a new chat session with AI',
        category: 'AI',
        icon: '💬',
        keywords: ['chat', 'new', 'session', 'ai'],
        action: () => this.executeAction('newChat'),
        context: ['global', 'chat'],
        enabled: true,
        priority: 10
      },
      {
        id: 'switch-ai-model',
        name: 'Switch AI Model',
        description: 'Change the current AI model',
        category: 'AI',
        icon: '🤖',
        keywords: ['model', 'switch', 'ai', 'change'],
        action: () => this.executeAction('switchModel'),
        context: ['global', 'chat'],
        enabled: true,
        priority: 9
      },
      {
        id: 'upload-pdb-file',
        name: 'Upload PDB File',
        description: 'Upload a molecular structure file',
        category: 'Files',
        icon: '🧬',
        keywords: ['upload', 'pdb', 'structure', 'file', 'molecule'],
        action: () => this.executeAction('uploadFile'),
        context: ['global'],
        enabled: true,
        priority: 8
      },
      {
        id: 'export-conversation',
        name: 'Export Conversation',
        description: 'Export chat history to file',
        category: 'Export',
        icon: '📤',
        keywords: ['export', 'conversation', 'chat', 'history', 'save'],
        action: () => this.executeAction('exportChat'),
        context: ['chat'],
        enabled: true,
        priority: 7
      },
      {
        id: 'export-molecular-view',
        name: 'Export Molecular View',
        description: 'Export current molecular visualization',
        category: 'Export',
        icon: '🖼️',
        keywords: ['export', 'image', 'molecular', 'view', 'structure'],
        action: () => this.executeAction('exportImage'),
        context: ['viewer'],
        enabled: true,
        priority: 6
      },
      {
        id: 'open-settings',
        name: 'Open Settings',
        description: 'Open application settings',
        category: 'Settings',
        icon: '⚙️',
        keywords: ['settings', 'preferences', 'config'],
        action: () => this.executeAction('goToSettings'),
        context: ['global'],
        enabled: true,
        priority: 5
      },
      {
        id: 'toggle-performance-monitor',
        name: 'Performance Monitor',
        description: 'Show performance monitoring dashboard',
        category: 'Advanced',
        icon: '📊',
        keywords: ['performance', 'monitor', 'metrics', 'stats'],
        action: () => this.executeAction('openPerformanceMonitor'),
        context: ['global'],
        enabled: true,
        priority: 4
      },
      {
        id: 'search-files',
        name: 'Search Files',
        description: 'Search through uploaded files',
        category: 'Search',
        icon: '🔍',
        keywords: ['search', 'find', 'files', 'structures'],
        action: () => this.executeAction('focusSearch'),
        context: ['global'],
        enabled: true,
        priority: 3
      },
      {
        id: 'show-keyboard-shortcuts',
        name: 'Keyboard Shortcuts',
        description: 'Show all keyboard shortcuts',
        category: 'Help',
        icon: '⌨️',
        keywords: ['shortcuts', 'hotkeys', 'keyboard', 'help'],
        action: () => this.executeAction('showHelp'),
        context: ['global'],
        enabled: true,
        priority: 2
      },
      {
        id: 'reset-workspace',
        name: 'Reset Workspace',
        description: 'Reset workspace to default layout',
        category: 'Workspace',
        icon: '🔄',
        keywords: ['reset', 'workspace', 'layout', 'default'],
        action: () => this.executeAction('resetWorkspace'),
        context: ['global'],
        enabled: true,
        priority: 1
      }
    ];

    defaultCommands.forEach(command => {
      this.commands.set(command.id, command);
    });
  }

  startListening() {
    if (this.isListening) return;

    this.isListening = true;
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  stopListening() {
    if (!this.isListening) return;

    this.isListening = false;
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent) {
    // Don't trigger shortcuts when user is typing in input fields
    if (this.isInputFocused()) return;

    const shortcut = this.findMatchingShortcut(event);
    if (shortcut && shortcut.enabled) {
      event.preventDefault();
      event.stopPropagation();
      this.executeAction(shortcut.action);
    }
  }

  private isInputFocused(): boolean {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const tagName = activeElement.tagName.toLowerCase();
    return tagName === 'input' || 
           tagName === 'textarea' || 
           tagName === 'select' ||
           activeElement.getAttribute('contenteditable') === 'true';
  }

  private findMatchingShortcut(event: KeyboardEvent): KeyboardShortcut | null {
    const pressedKey = event.key.toLowerCase();
    const pressedModifiers = [];

    if (event.ctrlKey) pressedModifiers.push('ctrl');
    if (event.altKey) pressedModifiers.push('alt');
    if (event.shiftKey) pressedModifiers.push('shift');
    if (event.metaKey) pressedModifiers.push('meta');

    for (const shortcut of this.shortcuts.values()) {
      if (shortcut.keys.includes(pressedKey) || shortcut.keys.includes(event.key)) {
        const modifiersMatch = this.modifiersMatch(shortcut.modifiers, pressedModifiers);
        if (modifiersMatch && this.isShortcutInCurrentContext(shortcut)) {
          return shortcut;
        }
      }
    }

    return null;
  }

  private modifiersMatch(required: string[], pressed: string[]): boolean {
    if (required.length !== pressed.length) return false;
    return required.every(modifier => pressed.includes(modifier));
  }

  private isShortcutInCurrentContext(shortcut: KeyboardShortcut): boolean {
    if (shortcut.context === 'global') return true;
    
    // Simple context detection - in a real implementation, this would be more sophisticated
    const currentPath = window.location.pathname;
    const currentContext = this.getCurrentContext();
    
    return shortcut.context === currentContext;
  }

  private getCurrentContext(): string {
    const path = window.location.pathname;
    if (path.includes('chat')) return 'chat';
    if (path.includes('viewer')) return 'viewer';
    if (path.includes('files')) return 'files';
    if (path.includes('settings')) return 'settings';
    return 'global';
  }

  private executeAction(action: string) {
    // Emit custom event that components can listen to
    const event = new CustomEvent('shortcut-action', {
      detail: { action }
    });
    document.dispatchEvent(event);
  }

  // Public API methods
  getAllShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  getShortcutsByCategory(category: string): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values()).filter(s => s.category === category);
  }

  getShortcutsByContext(context: string): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values()).filter(s => s.context === context);
  }

  getShortcut(id: string): KeyboardShortcut | null {
    return this.shortcuts.get(id) || null;
  }

  updateShortcut(id: string, updates: Partial<KeyboardShortcut>): boolean {
    const shortcut = this.shortcuts.get(id);
    if (!shortcut) return false;

    const updatedShortcut = { ...shortcut, ...updates };
    this.shortcuts.set(id, updatedShortcut);
    return true;
  }

  addShortcut(shortcut: KeyboardShortcut): boolean {
    if (this.shortcuts.has(shortcut.id)) return false;

    this.shortcuts.set(shortcut.id, shortcut);
    return true;
  }

  removeShortcut(id: string): boolean {
    return this.shortcuts.delete(id);
  }

  resetToDefaults(): void {
    this.shortcuts.clear();
    this.initializeDefaultShortcuts();
  }

  // Command Palette methods
  getAllCommands(): CommandPaletteItem[] {
    return Array.from(this.commands.values());
  }

  getCommandsByCategory(category: string): CommandPaletteItem[] {
    return Array.from(this.commands.values()).filter(c => c.category === category);
  }

  getCommandsByContext(context: string): CommandPaletteItem[] {
    return Array.from(this.commands.values()).filter(c => c.context.includes(context));
  }

  searchCommands(query: string): CommandPaletteItem[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.commands.values())
      .filter(command => 
        command.name.toLowerCase().includes(lowerQuery) ||
        command.description.toLowerCase().includes(lowerQuery) ||
        command.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))
      )
      .sort((a, b) => {
        // Prioritize exact matches and higher priority commands
        const aExact = a.name.toLowerCase() === lowerQuery ? 100 : 0;
        const bExact = b.name.toLowerCase() === lowerQuery ? 100 : 0;
        return (bExact + b.priority) - (aExact + a.priority);
      });
  }

  getShortcutString(shortcut: KeyboardShortcut): string {
    const modifiers = shortcut.modifiers.map(mod => {
      switch (mod) {
        case 'ctrl': return navigator.platform.includes('Mac') ? '⌘' : 'Ctrl';
        case 'alt': return navigator.platform.includes('Mac') ? '⌥' : 'Alt';
        case 'shift': return '⇧';
        case 'meta': return navigator.platform.includes('Mac') ? '⌘' : 'Win';
        default: return mod;
      }
    });

    const keys = shortcut.keys.map(key => {
      switch (key) {
        case ' ': return 'Space';
        case 'ArrowUp': return '↑';
        case 'ArrowDown': return '↓';
        case 'ArrowLeft': return '←';
        case 'ArrowRight': return '→';
        case 'Enter': return '↵';
        case 'Escape': return 'Esc';
        case 'Backspace': return '⌫';
        case 'Delete': return 'Del';
        case 'Tab': return '⇥';
        default: return key.toUpperCase();
      }
    });

    return [...modifiers, ...keys].join(' + ');
  }

  exportShortcuts(): string {
    const shortcuts = Array.from(this.shortcuts.values());
    return JSON.stringify(shortcuts, null, 2);
  }

  importShortcuts(data: string): boolean {
    try {
      const shortcuts = JSON.parse(data) as KeyboardShortcut[];
      this.shortcuts.clear();
      shortcuts.forEach(shortcut => {
        this.shortcuts.set(shortcut.id, shortcut);
      });
      return true;
    } catch (error) {
      console.error('Failed to import shortcuts:', error);
      return false;
    }
  }

  validateShortcut(shortcut: Partial<KeyboardShortcut>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!shortcut.id) errors.push('ID is required');
    if (!shortcut.name) errors.push('Name is required');
    if (!shortcut.keys || shortcut.keys.length === 0) errors.push('At least one key is required');
    if (!shortcut.action) errors.push('Action is required');
    if (!shortcut.context) errors.push('Context is required');

    // Check for conflicts
    if (shortcut.id && shortcut.keys && shortcut.modifiers) {
      const existing = this.findConflictingShortcut(shortcut as KeyboardShortcut);
      if (existing && existing.id !== shortcut.id) {
        errors.push(`Conflicts with existing shortcut: ${existing.name}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private findConflictingShortcut(shortcut: KeyboardShortcut): KeyboardShortcut | null {
    for (const existing of this.shortcuts.values()) {
      if (existing.id === shortcut.id) continue;
      
      const sameKeys = existing.keys.length === shortcut.keys.length &&
                      existing.keys.every(key => shortcut.keys.includes(key));
      const sameModifiers = existing.modifiers.length === shortcut.modifiers.length &&
                           existing.modifiers.every(mod => shortcut.modifiers.includes(mod));
      const sameContext = existing.context === shortcut.context || 
                         existing.context === 'global' || 
                         shortcut.context === 'global';

      if (sameKeys && sameModifiers && sameContext) {
        return existing;
      }
    }
    return null;
  }
}

export const keyboardShortcutManager = new KeyboardShortcutManager();