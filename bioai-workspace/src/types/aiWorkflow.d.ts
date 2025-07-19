import type { BaseMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";

// Core AI Workflow Types
export interface AIWorkflowState {
  messages: BaseMessage[];
  context: ConversationContext;
  currentStep: string;
  completedSteps: string[];
  pendingActions: PendingAction[];
  metadata: WorkflowMetadata;
  errors: WorkflowError[];
}

export interface ConversationContext {
  molecular: MolecularContext;
  user: UserContext;
  session: SessionContext;
  tools: ToolContext;
}

export interface MolecularContext {
  currentStructure?: {
    id: string;
    url: string;
    type: 'pdb' | 'mmcif' | 'mol2';
    metadata: {
      name: string;
      resolution?: number;
      organism?: string;
      method?: string;
      depositionDate?: string;
    };
  };
  selectedResidues: SelectedResidue[];
  viewerState: {
    camera?: any;
    representations: any[];
    selections: any[];
    zoom?: number;
    center?: [number, number, number];
  };
  analysisResults: AnalysisResult[];
  searchHistory: string[];
}

export interface SelectedResidue {
  chainId: string;
  residueNumber: number;
  residueName: string;
  atomName?: string;
  coordinates?: [number, number, number];
  properties?: {
    bFactor?: number;
    occupancy?: number;
    element?: string;
  };
}

export interface AnalysisResult {
  id: string;
  type: 'structure' | 'sequence' | 'interaction' | 'property' | 'comparison';
  timestamp: number;
  input: any;
  output: any;
  metadata: {
    tool: string;
    duration: number;
    success: boolean;
    error?: string;
  };
}

export interface UserContext {
  id: string;
  preferences: {
    analysisDepth: 'basic' | 'intermediate' | 'advanced';
    outputFormat: 'concise' | 'detailed' | 'technical';
    visualizations: boolean;
    notifications: boolean;
  };
  expertise: {
    level: 'novice' | 'intermediate' | 'expert';
    domains: string[];
    interests: string[];
  };
  researchGoals: string[];
  currentProject?: {
    name: string;
    description: string;
    targets: string[];
    notes: string[];
  };
}

export interface SessionContext {
  id: string;
  startTime: number;
  duration: number;
  messageCount: number;
  topicsDiscussed: string[];
  toolsUsed: string[];
  keyFindings: string[];
  followUpActions: string[];
}

export interface ToolContext {
  availableTools: AvailableTool[];
  toolHistory: ToolExecution[];
  activeOperations: ActiveOperation[];
  preferences: ToolPreferences;
}

export interface AvailableTool {
  name: string;
  description: string;
  category: 'molecular' | 'structural' | 'sequence' | 'visualization' | 'analysis';
  parameters: ToolParameter[];
  enabled: boolean;
  lastUsed?: number;
  usage: {
    count: number;
    successRate: number;
    averageDuration: number;
  };
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  default?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
}

export interface ToolExecution {
  id: string;
  toolName: string;
  timestamp: number;
  input: any;
  output: any;
  duration: number;
  success: boolean;
  error?: string;
  context: string;
}

export interface ActiveOperation {
  id: string;
  toolName: string;
  startTime: number;
  progress: number;
  estimatedCompletion?: number;
  status: 'queued' | 'running' | 'paused' | 'completed' | 'failed';
  cancellable: boolean;
}

export interface ToolPreferences {
  timeout: number;
  retryAttempts: number;
  parallelExecutions: number;
  priorityOrder: string[];
  autoRetry: boolean;
}

// Workflow Execution Types
export interface PendingAction {
  id: string;
  type: 'tool_call' | 'user_input' | 'context_update' | 'analysis';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration?: number;
  dependencies: string[];
  parameters: any;
  createdAt: number;
}

export interface WorkflowMetadata {
  workflowId: string;
  version: string;
  createdAt: number;
  updatedAt: number;
  userId: string;
  sessionId: string;
  totalSteps: number;
  currentStepIndex: number;
  estimatedCompletion?: number;
  performance: {
    totalTokens: number;
    totalDuration: number;
    apiCalls: number;
    cacheHits: number;
  };
}

export interface WorkflowError {
  id: string;
  timestamp: number;
  type: 'tool_error' | 'api_error' | 'validation_error' | 'timeout_error' | 'user_error';
  message: string;
  details: any;
  step: string;
  recoverable: boolean;
  retryCount: number;
  maxRetries: number;
}

// AI Orchestrator Types
export interface AIOrchestrator {
  processMessage: (message: string, context: ConversationContext) => Promise<AIWorkflowResult>;
  executeWorkflow: (workflowType: string, parameters: any) => Promise<AIWorkflowResult>;
  getWorkflowStatus: (workflowId: string) => Promise<WorkflowStatus>;
  cancelWorkflow: (workflowId: string) => Promise<boolean>;
  updateContext: (updates: Partial<ConversationContext>) => Promise<void>;
  getAvailableTools: () => Promise<AvailableTool[]>;
  executeToolChain: (tools: string[], parameters: any[]) => Promise<ToolChainResult>;
}

export interface AIWorkflowResult {
  workflowId: string;
  response: string;
  actions: CompletedAction[];
  newContext: Partial<ConversationContext>;
  suggestedFollowUps: string[];
  metadata: {
    tokensUsed: number;
    duration: number;
    toolsInvoked: string[];
    confidence: number;
    sources: string[];
  };
  status: 'completed' | 'partial' | 'failed' | 'requires_input';
}

export interface CompletedAction {
  id: string;
  type: string;
  description: string;
  result: any;
  timestamp: number;
  duration: number;
  success: boolean;
  metadata: any;
}

export interface WorkflowStatus {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  progress: number;
  currentStep: string;
  totalSteps: number;
  startTime: number;
  endTime?: number;
  estimatedCompletion?: number;
  errors: WorkflowError[];
  results: CompletedAction[];
}

export interface ToolChainResult {
  chainId: string;
  results: ToolExecution[];
  finalOutput: any;
  success: boolean;
  duration: number;
  errors: WorkflowError[];
  metadata: {
    toolCount: number;
    totalTokens: number;
    cacheHits: number;
  };
}

// Hook and State Management Types
export interface AIWorkflowHookState {
  isProcessing: boolean;
  currentWorkflow?: AIWorkflowState;
  activeWorkflows: Map<string, WorkflowStatus>;
  context: ConversationContext;
  error?: string;
  lastResult?: AIWorkflowResult;
  workflowHistory: WorkflowHistoryEntry[];
}

export interface WorkflowHistoryEntry {
  id: string;
  timestamp: number;
  userMessage: string;
  aiResponse: string;
  actions: CompletedAction[];
  context: Partial<ConversationContext>;
  metadata: {
    duration: number;
    tokensUsed: number;
    toolsUsed: string[];
  };
}

export interface AIWorkflowHookActions {
  processMessage: (message: string) => Promise<AIWorkflowResult>;
  executeWorkflow: (type: string, params: any) => Promise<AIWorkflowResult>;
  updateContext: (updates: Partial<ConversationContext>) => void;
  cancelWorkflow: (workflowId: string) => Promise<boolean>;
  retryLastWorkflow: () => Promise<AIWorkflowResult>;
  clearHistory: () => void;
  exportWorkflowHistory: (format: 'json' | 'csv' | 'markdown') => string;
}

export interface AIWorkflowHookReturn {
  state: AIWorkflowHookState;
  actions: AIWorkflowHookActions;
}

// Configuration Types
export interface LangGraphConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  retryAttempts: number;
  enableStreaming: boolean;
  enableCaching: boolean;
  // OpenRouter specific fields
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
  tools: ToolConfig[];
  workflows: WorkflowConfig[];
}

export interface ToolConfig {
  name: string;
  enabled: boolean;
  timeout: number;
  maxRetries: number;
  rateLimit?: {
    requests: number;
    window: number;
  };
  parameters: ToolParameter[];
}

export interface WorkflowConfig {
  name: string;
  description: string;
  steps: WorkflowStep[];
  conditions: WorkflowCondition[];
  fallbacks: WorkflowFallback[];
  metadata: {
    category: string;
    complexity: 'simple' | 'medium' | 'complex';
    estimatedDuration: number;
  };
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'tool' | 'condition' | 'input' | 'output' | 'transformation';
  parameters: any;
  dependencies: string[];
  optional: boolean;
  retryable: boolean;
  timeout?: number;
}

export interface WorkflowCondition {
  id: string;
  condition: string;
  truePath: string[];
  falsePath: string[];
  defaultPath?: string[];
}

export interface WorkflowFallback {
  trigger: 'error' | 'timeout' | 'user_cancel' | 'context_missing';
  action: 'retry' | 'skip' | 'alternative_workflow' | 'user_prompt';
  parameters: any;
  maxAttempts?: number;
}