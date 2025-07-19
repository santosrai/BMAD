// LangGraph.js Integration for BioAI Workspace
// Main entry point for AI workflow orchestration

export { 
  LangGraphWorkflowEngine, 
  getWorkflowEngine, 
  resetWorkflowEngine 
} from './workflowEngine';

export {
  createWorkflowGraph,
  defaultLangGraphConfig,
  validateWorkflowConfig,
  workflowSteps,
  type WorkflowState
} from './workflowConfig';

export {
  MolecularAnalysisTool,
  ViewerControlTool,
  PDBSearchTool
} from './tools';

// Re-export types for convenience
export type {
  AIWorkflowState,
  ConversationContext,
  LangGraphConfig,
  WorkflowConfig,
  AIOrchestrator,
  AIWorkflowResult,
  WorkflowStatus,
  ToolChainResult
} from '../../types/aiWorkflow';

// Default configuration for quick setup
export const quickSetupConfig = {
  // Use environment variables or provide defaults
  apiKey: process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  enableStreaming: true,
  enableCaching: true
};

// Helper function to create a pre-configured workflow engine
export function createBioAIWorkflowEngine(apiKey?: string) {
  const config = {
    ...quickSetupConfig,
    ...(apiKey && { apiKey })
  };
  
  return getWorkflowEngine(config);
}

// Version information
export const VERSION = '1.0.0';
export const LANGRAPH_VERSION = '0.3.9';

// Feature flags for progressive enhancement
export const FEATURES = {
  STREAMING_RESPONSES: true,
  WORKFLOW_CACHING: true,
  CONTEXT_PERSISTENCE: true,
  TOOL_CHAINING: true,
  ERROR_RECOVERY: true,
  PERFORMANCE_MONITORING: true
} as const;