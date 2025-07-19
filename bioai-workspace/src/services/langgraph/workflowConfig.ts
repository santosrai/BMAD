import { StateGraph, Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import type { 
  AIWorkflowState, 
  ConversationContext, 
  LangGraphConfig,
  WorkflowConfig,
  WorkflowStep 
} from "../../types/aiWorkflow";

// Define the state annotation for LangGraph
export const WorkflowStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  context: Annotation<ConversationContext>({
    reducer: (x, y) => ({ ...x, ...y }),
  }),
  currentStep: Annotation<string>(),
  completedSteps: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
  }),
  pendingActions: Annotation<any[]>({
    reducer: (x, y) => x.concat(y),
  }),
  metadata: Annotation<any>({
    reducer: (x, y) => ({ ...x, ...y }),
  }),
  errors: Annotation<any[]>({
    reducer: (x, y) => x.concat(y),
  }),
});

export type WorkflowState = typeof WorkflowStateAnnotation.State;

// Default LangGraph configuration
export const defaultLangGraphConfig: LangGraphConfig = {
  apiKey: '', // Will be provided dynamically from user settings
  model: 'openai/gpt-4o-mini', // OpenRouter model format
  temperature: 0.7,
  maxTokens: 2048,
  timeout: 30000,
  retryAttempts: 3,
  enableStreaming: true,
  enableCaching: true,
  // OpenRouter configuration
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://your-app-domain.com', // Replace with your actual domain
    'X-Title': 'BioAI Workspace',
  },
  tools: [
    {
      name: 'molecular_analysis',
      enabled: true,
      timeout: 15000,
      maxRetries: 2,
      parameters: [
        {
          name: 'structure_id',
          type: 'string',
          required: true,
          description: 'PDB ID or structure identifier'
        },
        {
          name: 'analysis_type',
          type: 'string',
          required: true,
          description: 'Type of analysis to perform',
          validation: {
            enum: ['structure', 'sequence', 'interaction', 'property']
          }
        }
      ]
    },
    {
      name: 'viewer_control',
      enabled: true,
      timeout: 5000,
      maxRetries: 1,
      parameters: [
        {
          name: 'action',
          type: 'string',
          required: true,
          description: 'Viewer action to perform',
          validation: {
            enum: ['load', 'zoom', 'rotate', 'highlight', 'select']
          }
        },
        {
          name: 'parameters',
          type: 'object',
          required: false,
          description: 'Action-specific parameters'
        }
      ]
    },
    {
      name: 'pdb_search',
      enabled: true,
      timeout: 10000,
      maxRetries: 2,
      parameters: [
        {
          name: 'query',
          type: 'string',
          required: true,
          description: 'Search query for PDB database'
        },
        {
          name: 'limit',
          type: 'number',
          required: false,
          description: 'Maximum number of results',
          default: 10,
          validation: {
            min: 1,
            max: 100
          }
        }
      ]
    }
  ],
  workflows: [
    {
      name: 'conversation_processing',
      description: 'Main conversation processing workflow',
      steps: [
        {
          id: 'input_analysis',
          name: 'Analyze User Input',
          type: 'tool',
          parameters: {},
          dependencies: [],
          optional: false,
          retryable: true
        },
        {
          id: 'context_gathering',
          name: 'Gather Context',
          type: 'tool',
          parameters: {},
          dependencies: ['input_analysis'],
          optional: false,
          retryable: true
        },
        {
          id: 'tool_selection',
          name: 'Select Appropriate Tools',
          type: 'condition',
          parameters: {},
          dependencies: ['context_gathering'],
          optional: false,
          retryable: false
        },
        {
          id: 'tool_execution',
          name: 'Execute Selected Tools',
          type: 'tool',
          parameters: {},
          dependencies: ['tool_selection'],
          optional: false,
          retryable: true
        },
        {
          id: 'response_generation',
          name: 'Generate Response',
          type: 'output',
          parameters: {},
          dependencies: ['tool_execution'],
          optional: false,
          retryable: true
        }
      ],
      conditions: [
        {
          id: 'tool_selection_condition',
          condition: 'context.molecular.currentStructure !== null',
          truePath: ['molecular_analysis', 'viewer_control'],
          falsePath: ['pdb_search'],
          defaultPath: ['pdb_search']
        }
      ],
      fallbacks: [
        {
          trigger: 'error',
          action: 'retry',
          parameters: { maxAttempts: 2 },
          maxAttempts: 2
        },
        {
          trigger: 'timeout',
          action: 'alternative_workflow',
          parameters: { workflow: 'simple_response' }
        }
      ],
      metadata: {
        category: 'conversation',
        complexity: 'medium',
        estimatedDuration: 5000
      }
    },
    {
      name: 'molecular_analysis_workflow',
      description: 'Comprehensive molecular structure analysis',
      steps: [
        {
          id: 'structure_validation',
          name: 'Validate Structure',
          type: 'tool',
          parameters: {},
          dependencies: [],
          optional: false,
          retryable: true
        },
        {
          id: 'analysis_execution',
          name: 'Execute Analysis',
          type: 'tool',
          parameters: {},
          dependencies: ['structure_validation'],
          optional: false,
          retryable: true
        },
        {
          id: 'result_processing',
          name: 'Process Results',
          type: 'transformation',
          parameters: {},
          dependencies: ['analysis_execution'],
          optional: false,
          retryable: true
        },
        {
          id: 'visualization_update',
          name: 'Update Visualization',
          type: 'tool',
          parameters: {},
          dependencies: ['result_processing'],
          optional: true,
          retryable: true
        }
      ],
      conditions: [],
      fallbacks: [
        {
          trigger: 'error',
          action: 'skip',
          parameters: { skipToStep: 'result_processing' }
        }
      ],
      metadata: {
        category: 'analysis',
        complexity: 'complex',
        estimatedDuration: 15000
      }
    }
  ]
};

// Workflow step function implementations
export const workflowSteps = {
  async inputAnalysis(state: WorkflowState): Promise<Partial<WorkflowState>> {
    const lastMessage = state.messages[state.messages.length - 1];
    const messageContent = lastMessage?.content || '';
    
    // Analyze the user input to determine intent and extract entities
    const analysis = {
      intent: analyzeIntent(messageContent),
      entities: extractEntities(messageContent),
      confidence: 0.8
    };
    
    return {
      metadata: {
        ...state.metadata,
        inputAnalysis: analysis,
        currentStep: 'context_gathering'
      },
      currentStep: 'context_gathering'
    };
  },

  async contextGathering(state: WorkflowState): Promise<Partial<WorkflowState>> {
    // Gather relevant context from molecular viewer, session history, etc.
    const context = {
      hasActiveStructure: !!state.context.molecular.currentStructure,
      selectedResidues: state.context.molecular.selectedResidues,
      recentQueries: state.context.session.topicsDiscussed.slice(-5),
      userExpertise: state.context.user.expertise.level
    };
    
    return {
      metadata: {
        ...state.metadata,
        contextData: context,
        currentStep: 'tool_selection'
      },
      currentStep: 'tool_selection'
    };
  },

  async toolSelection(state: WorkflowState): Promise<Partial<WorkflowState>> {
    const inputAnalysis = state.metadata?.inputAnalysis;
    const contextData = state.metadata?.contextData;
    
    // Select appropriate tools based on intent and context
    const selectedTools = selectToolsForIntent(inputAnalysis?.intent, contextData);
    
    return {
      metadata: {
        ...state.metadata,
        selectedTools,
        currentStep: 'tool_execution'
      },
      currentStep: 'tool_execution'
    };
  },

  async responseGeneration(state: WorkflowState): Promise<Partial<WorkflowState>> {
    const toolResults = state.metadata?.toolResults || [];
    const selectedTools = state.metadata?.selectedTools || [];
    
    // Generate response based on tool results and context
    const response = generateContextualResponse(toolResults, state.context);
    
    return {
      metadata: {
        ...state.metadata,
        response,
        currentStep: 'completed'
      },
      currentStep: 'completed'
    };
  }
};

// Helper functions for workflow processing
function analyzeIntent(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('load') || lowerMessage.includes('search') || lowerMessage.includes('find')) {
    return 'search_and_load';
  }
  if (lowerMessage.includes('analyze') || lowerMessage.includes('study') || lowerMessage.includes('examine')) {
    return 'analysis';
  }
  if (lowerMessage.includes('zoom') || lowerMessage.includes('rotate') || lowerMessage.includes('view')) {
    return 'viewer_control';
  }
  if (lowerMessage.includes('select') || lowerMessage.includes('highlight') || lowerMessage.includes('focus')) {
    return 'selection';
  }
  
  return 'general_inquiry';
}

function extractEntities(message: string): Record<string, any> {
  const entities: Record<string, any> = {};
  
  // Extract PDB IDs (4-character alphanumeric codes)
  const pdbMatches = message.match(/\b[0-9][A-Za-z0-9]{3}\b/g);
  if (pdbMatches) {
    entities.pdbIds = pdbMatches;
  }
  
  // Extract residue numbers
  const residueMatches = message.match(/\b(?:residue|amino acid|aa)\s+(\d+)\b/gi);
  if (residueMatches) {
    entities.residues = residueMatches.map(match => parseInt(match.replace(/\D/g, '')));
  }
  
  // Extract chain identifiers
  const chainMatches = message.match(/\bchain\s+([A-Za-z])\b/gi);
  if (chainMatches) {
    entities.chains = chainMatches.map(match => match.replace(/\D/g, ''));
  }
  
  return entities;
}

function selectToolsForIntent(intent: string, context: any): string[] {
  switch (intent) {
    case 'search_and_load':
      return context.hasActiveStructure ? ['viewer_control'] : ['pdb_search', 'viewer_control'];
    case 'analysis':
      return context.hasActiveStructure ? ['molecular_analysis'] : ['pdb_search', 'molecular_analysis'];
    case 'viewer_control':
      return ['viewer_control'];
    case 'selection':
      return ['viewer_control'];
    default:
      return context.hasActiveStructure ? ['molecular_analysis'] : ['pdb_search'];
  }
}

function generateContextualResponse(toolResults: any[], context: ConversationContext): string {
  if (toolResults.length === 0) {
    return "I understand your request, but I need more information to provide a helpful response.";
  }
  
  // Generate response based on tool results and user expertise level
  const expertise = context.user.expertise.level;
  const responses = toolResults.map(result => {
    if (expertise === 'expert') {
      return generateTechnicalResponse(result);
    } else if (expertise === 'intermediate') {
      return generateIntermediateResponse(result);
    } else {
      return generateBeginnerResponse(result);
    }
  });
  
  return responses.join('\n\n');
}

function generateTechnicalResponse(result: any): string {
  return `Technical analysis completed: ${JSON.stringify(result, null, 2)}`;
}

function generateIntermediateResponse(result: any): string {
  return `Analysis results: ${result.summary || 'Analysis completed successfully.'}`;
}

function generateBeginnerResponse(result: any): string {
  return `I've analyzed the structure and found: ${result.description || 'Interesting findings about this molecule.'}`;
}

// Create the main workflow graph
export function createWorkflowGraph(): StateGraph<typeof WorkflowStateAnnotation> {
  const workflow = new StateGraph(WorkflowStateAnnotation)
    .addNode("input_analysis", workflowSteps.inputAnalysis)
    .addNode("context_gathering", workflowSteps.contextGathering)
    .addNode("tool_selection", workflowSteps.toolSelection)
    .addNode("response_generation", workflowSteps.responseGeneration)
    .addEdge("__start__", "input_analysis")
    .addEdge("input_analysis", "context_gathering")
    .addEdge("context_gathering", "tool_selection")
    .addEdge("tool_selection", "response_generation")
    .addEdge("response_generation", "__end__");

  return workflow;
}

// Export configuration validation
export function validateWorkflowConfig(config: LangGraphConfig): boolean {
  try {
    if (!config.apiKey || config.apiKey.trim() === '') {
      console.warn('LangGraph configuration missing OpenRouter API key');
      console.warn('Please set your OpenRouter API key in the settings page');
      return false;
    }
    
    if (!config.model) {
      console.warn('LangGraph configuration missing model specification');
      return false;
    }
    
    if (!config.tools || config.tools.length === 0) {
      console.warn('LangGraph configuration missing tool definitions');
      return false;
    }
    
    if (!config.workflows || config.workflows.length === 0) {
      console.warn('LangGraph configuration missing workflow definitions');
      return false;
    }
    
    // Validate OpenRouter specific configuration
    if (config.baseURL && !config.baseURL.includes('openrouter.ai')) {
      console.warn('Base URL should point to OpenRouter API');
    }
    
    return true;
  } catch (error) {
    console.error('Error validating LangGraph configuration:', error);
    return false;
  }
}