/**
 * Empty State Handler Service
 * Provides comprehensive handling for empty states across the BioAI Workspace
 */

import { api } from '../../convex/_generated/api';
import type { ConvexReactClient } from 'convex/react';
import type { Id } from '../../convex/_generated/dataModel';

export interface EmptyStateConfig {
  showEmptyStates: boolean;
  autoCreateSessions: boolean;
  showWelcomeTour: boolean;
  enableSmartSuggestions: boolean;
}

export interface EmptyStateData {
  type: 'session' | 'chat' | 'viewer' | 'workflow' | 'search' | 'export';
  title: string;
  description: string;
  actionText: string;
  actionType: 'create' | 'load' | 'search' | 'upload' | 'tutorial';
  icon: string;
  suggestions?: string[];
  isDismissible: boolean;
}

export interface EmptyStateHandlerOptions {
  convexClient: ConvexReactClient;
  userId: string;
  config?: Partial<EmptyStateConfig>;
}

export interface UserContext {
  userType?: 'learner' | 'powerUser' | 'researcher';
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
}

export class EmptyStateHandler {
  private convexClient: ConvexReactClient;
  private userId: string;
  private config: EmptyStateConfig;
  private dismissedStates: Set<string> = new Set();

  constructor(options: EmptyStateHandlerOptions) {
    this.convexClient = options.convexClient;
    this.userId = options.userId;
    this.config = {
      showEmptyStates: true,
      autoCreateSessions: true,
      showWelcomeTour: true,
      enableSmartSuggestions: true,
      ...options.config,
    };
  }

  /**
   * Get appropriate empty state for a given context
   */
  async getEmptyState(type: EmptyStateData['type'], context?: UserContext): Promise<EmptyStateData> {
    const baseStates = this.getBaseEmptyStates();
    let state = baseStates[type];

    // Customize based on context
    if (context) {
      state = this.customizeEmptyState(state, context);
    }

    // Check if this state has been dismissed
    if (this.dismissedStates.has(type)) {
      return { ...state, isDismissible: false };
    }

    return state;
  }

  /**
   * Handle empty session creation
   */
  async handleEmptySession(): Promise<{
    success: boolean;
    sessionId?: string;
    message?: string;
  }> {
    if (!this.config.autoCreateSessions) {
      return { success: false, message: 'Auto-creation disabled' };
    }

    try {
      const sessionId = await this.convexClient.mutation(api.chat.createSession, {
        userId: this.userId,
        title: 'New Session',
      });

      // Add welcome message after session creation
      await this.convexClient.mutation(api.chat.addMessage, {
        sessionId: sessionId as Id<'chatSessions'>,
        userId: this.userId,
        content: 'Welcome to BioAI Workspace! How can I help you explore molecular structures today?',
        role: 'assistant',
      });

      return { success: true, sessionId };
    } catch (error) {
      console.error('Failed to create empty session:', error);
      return { success: false, message: 'Failed to create session' };
    }
  }

  /**
   * Handle empty chat state
   */
  async handleEmptyChat(sessionId: string): Promise<{
    success: boolean;
    suggestions?: string[];
  }> {
    if (!this.config.enableSmartSuggestions) {
      return { success: false };
    }

    try {
      const suggestions = await this.generateSmartSuggestions(sessionId);
      
      // Add welcome message if empty
      await this.convexClient.mutation(api.chat.addMessage, {
        sessionId: sessionId as Id<'chatSessions'>,
        userId: this.userId,
        content: 'Welcome! I can help you explore molecular structures. Try asking me to:\n\n' +
                '• "Show me the structure of insulin"\n' +
                '• "Find proteins similar to hemoglobin"\n' +
                '• "Analyze this PDB file for binding sites"\n' +
                '• "Create a visualization of this protein"',
        role: 'assistant',
      });

      return { success: true, suggestions };
    } catch (error) {
      console.error('Failed to handle empty chat:', error);
      return { success: false };
    }
  }

  /**
   * Handle empty viewer state
   */
  async handleEmptyViewer(): Promise<{
    success: boolean;
    demoStructures?: string[];
  }> {
    try {
      const demoStructures = [
        '1A1U', // Insulin
        '1HHO', // Hemoglobin
        '2LYZ', // Lysozyme
        '1BNA', // DNA
      ];

      return { success: true, demoStructures };
    } catch (error) {
      console.error('Failed to handle empty viewer:', error);
      return { success: false };
    }
  }

  /**
   * Handle empty search results
   */
  async handleEmptySearch(query: string): Promise<{
    success: boolean;
    suggestions?: string[];
    related?: string[];
  }> {
    try {
      const suggestions = [
        'Try searching with the protein name (e.g., "insulin")',
        'Use PDB ID format (e.g., "1A1U")',
        'Search by organism (e.g., "human hemoglobin")',
        'Try broader terms (e.g., "enzyme" instead of "specific enzyme")',
      ];

      const related = await this.findRelatedQueries(query);

      return { success: true, suggestions, related };
    } catch (error) {
      console.error('Failed to handle empty search:', error);
      return { success: false };
    }
  }

  /**
   * Handle empty export state
   */
  async handleEmptyExport(): Promise<{
    success: boolean;
    templates?: string[];
  }> {
    try {
      const templates = [
        'Export current structure as PDB',
        'Export conversation history',
        'Export molecular analysis report',
        'Export session snapshot',
      ];

      return { success: true, templates };
    } catch (error) {
      console.error('Failed to handle empty export:', error);
      return { success: false };
    }
  }

  /**
   * Dismiss an empty state
   */
  dismissEmptyState(type: string): void {
    this.dismissedStates.add(type);
    this.saveDismissedStates();
  }

  /**
   * Reset dismissed states
   */
  resetDismissedStates(): void {
    this.dismissedStates.clear();
    this.saveDismissedStates();
  }

  /**
   * Check if a state is empty
   */
  async isStateEmpty(type: EmptyStateData['type'], sessionId?: string): Promise<boolean> {
    try {
      switch (type) {
        case 'session': {
          const sessions = await this.convexClient.query(api.chat.getSessionsWithMetadata, {
            userId: this.userId,
            limit: 1,
          });
          return !sessions || sessions.length === 0;
        }
        case 'chat': {
          if (!sessionId) return true;
          const messages = await this.convexClient.query(api.chat.getSessionMessages, {
            sessionId: sessionId as Id<'chatSessions'>,
            userId: this.userId,
          });
          return !messages || messages.length === 0;
        }
        case 'viewer': {
          if (!sessionId) return true;
          const viewerState = await this.convexClient.query(api.viewerSessions.getViewerState, {
            sessionId: sessionId as Id<'chatSessions'>,
            userId: this.userId,
          });
          return !viewerState || !viewerState.viewerState || viewerState.viewerState.structures.length === 0;
        }
        case 'workflow': {
          if (!sessionId) return true;
          const workflows = await this.convexClient.query(api.aiWorkflows.getSessionWorkflows, {
            sessionId: sessionId as Id<'chatSessions'>,
            limit: 1,
          });
          return !workflows || workflows.length === 0;
        }
        case 'search':
          // Search state is empty by default until a search is performed
          return true;
        case 'export': {
          if (!sessionId) return true;
          const exports = await this.convexClient.query(api.exports.getExportHistory, {
            userId: this.userId,
            sessionId: sessionId as Id<'chatSessions'>,
            limit: 1,
          });
          return !exports || exports.exports.length === 0;
        }
        default:
          return true;
      }
    } catch (error) {
      console.error('Failed to check empty state:', error);
      return true;
    }
  }

  /**
   * Get welcome tour steps
   */
  getWelcomeTourSteps(): Array<{
    id: string;
    title: string;
    content: string;
    target: string;
    action?: string;
  }> {
    return [
      {
        id: 'welcome',
        title: 'Welcome to BioAI Workspace!',
        content: 'Your AI-powered bioinformatics research assistant',
        target: 'app-header',
      },
      {
        id: 'chat',
        title: 'Natural Language Interface',
        content: 'Ask questions about molecular structures in plain English',
        target: 'chat-panel',
        action: 'Try: "Show me the structure of insulin"',
      },
      {
        id: 'viewer',
        title: '3D Molecular Viewer',
        content: 'Explore structures with interactive 3D visualization',
        target: 'viewer-panel',
      },
      {
        id: 'search',
        title: 'PDB Search',
        content: 'Search the Protein Data Bank for structures',
        target: 'search-panel',
      },
      {
        id: 'export',
        title: 'Export & Share',
        content: 'Export your findings and share with collaborators',
        target: 'export-panel',
      },
    ];
  }

  private getBaseEmptyStates(): Record<EmptyStateData['type'], EmptyStateData> {
    return {
      session: {
        type: 'session',
        title: 'No Sessions Yet',
        description: 'Start your bioinformatics journey by creating your first session',
        actionText: 'Create New Session',
        actionType: 'create',
        icon: '🧬',
        suggestions: [
          'Create a new session to get started',
          'Import existing session data',
          'View tutorial examples',
        ],
        isDismissible: false,
      },
      chat: {
        type: 'chat',
        title: 'Start a Conversation',
        description: 'Ask me anything about molecular structures, protein analysis, or bioinformatics',
        actionText: 'Send a Message',
        actionType: 'create',
        icon: '💬',
        suggestions: [
          'Show me the structure of insulin',
          'Find proteins similar to hemoglobin',
          'Analyze this PDB file',
          'Create a visualization',
        ],
        isDismissible: true,
      },
      viewer: {
        type: 'viewer',
        title: 'No Structure Loaded',
        description: 'Load a molecular structure to start exploring in 3D',
        actionText: 'Load Structure',
        actionType: 'search',
        icon: '🧪',
        suggestions: [
          'Search PDB database',
          'Upload PDB file',
          'Load demo structures',
        ],
        isDismissible: true,
      },
      workflow: {
        type: 'workflow',
        title: 'No Active Workflows',
        description: 'Start an AI-powered analysis workflow',
        actionText: 'Start Workflow',
        actionType: 'create',
        icon: '⚡',
        suggestions: [
          'Analyze protein structure',
          'Compare molecular features',
          'Generate visualization',
        ],
        isDismissible: true,
      },
      search: {
        type: 'search',
        title: 'No Results Found',
        description: 'Try adjusting your search terms or browse popular structures',
        actionText: 'Browse Popular',
        actionType: 'search',
        icon: '🔍',
        suggestions: [
          'Try different keywords',
          'Use PDB ID format',
          'Browse by organism',
          'Check spelling',
        ],
        isDismissible: true,
      },
      export: {
        type: 'export',
        title: 'Nothing to Export',
        description: 'Load some data or complete an analysis to export',
        actionText: 'Load Data',
        actionType: 'load',
        icon: '📊',
        suggestions: [
          'Load a structure',
          'Complete an analysis',
          'Save session snapshot',
        ],
        isDismissible: true,
      },
    };
  }

  private customizeEmptyState(state:
