// Session persistence type definitions
export interface SessionPersistenceState {
  isAutoSaving: boolean;
  lastSaved: number | null;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  pendingChanges: number;
  isOnline: boolean;
  offlineQueueSize: number;
  sessionRestored: boolean;
  integrityIssues: string[];
}

export interface SessionMetadata {
  sessionId: string;
  userId: string;
  title: string;
  description?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;
  messageCount: number;
  isActive: boolean;
  autoSaveEnabled: boolean;
  settings: {
    autoSave: boolean;
    notificationsEnabled: boolean;
    theme?: string;
  };
}

export interface SessionSnapshot {
  id: string;
  sessionId: string;
  userId: string;
  snapshotType: 'auto' | 'manual' | 'checkpoint';
  timestamp: number;
  isRecoverable: boolean;
  expiresAt?: number;
  metadata: {
    size: number;
    checksum?: string;
    description?: string;
    tags?: string[];
  };
  data: SessionSnapshotData;
}

export interface SessionSnapshotData {
  chatState: {
    messages: any[];
    messageCount: number;
    sessionTitle: string;
  };
  viewerState?: SerializableViewerState;
  aiWorkflowState?: AIWorkflowState;
  userInteractions?: UserInteraction[];
}

export interface SerializableViewerState {
  structures: StructureData[];
  camera: CameraState;
  representations: RepresentationData[];
  selections: SelectionData[];
  measurements: MeasurementData[];
  annotations: AnnotationData[];
  viewingMode: ViewingMode;
  visualization: VisualizationSettings;
  viewport: ViewportSettings;
  performance: PerformanceSettings;
}

export interface StructureData {
  id: string;
  url: string;
  name: string;
  loadedAt: number;
  type?: string;
  format?: string;
  metadata?: Record<string, any>;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
  fov: number;
  near: number;
  far: number;
}

export interface RepresentationData {
  id: string;
  type: string;
  params: Record<string, any>;
  structureId: string;
  visible: boolean;
  opacity: number;
  color?: string;
}

export interface SelectionData {
  id: string;
  label: string;
  expression: string;
  structureId: string;
  type: 'residue' | 'atom' | 'chain' | 'custom';
  highlight: boolean;
  color?: string;
}

export interface MeasurementData {
  id: string;
  type: 'distance' | 'angle' | 'dihedral' | 'rmsd';
  atoms: Array<{
    structureId: string;
    atomId: string;
    position: [number, number, number];
  }>;
  value: number;
  unit: string;
  label: string;
  visible: boolean;
}

export interface AnnotationData {
  id: string;
  type: 'text' | 'arrow' | 'highlight' | 'note';
  position: [number, number, number];
  content: string;
  style: Record<string, any>;
  visible: boolean;
}

export type ViewingMode = 'cartoon' | 'surface' | 'ball-and-stick' | 'spacefill' | 'ribbon' | 'custom';

export interface VisualizationSettings {
  lighting: {
    ambient: number;
    directional: number;
    shadows: boolean;
    shadowIntensity: number;
  };
  quality: 'low' | 'medium' | 'high' | 'ultra';
  transparency: number;
  colorScheme: string;
  backgroundColor: string;
  fog: {
    enabled: boolean;
    near: number;
    far: number;
    color: string;
  };
}

export interface ViewportSettings {
  width: number;
  height: number;
  pixelRatio: number;
}

export interface PerformanceSettings {
  levelOfDetail: boolean;
  maxAtoms: number;
  simplificationLevel: number;
}

export interface AIWorkflowState {
  workflowId: string;
  workflowType: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  progress: number;
  currentStep: string;
  totalSteps: number;
  conversationMemory: ConversationMemory;
  toolStates: Record<string, ToolState>;
  executionState: ExecutionState;
  metrics: WorkflowMetrics;
}

export interface ConversationMemory {
  recentMessages: any[];
  entityMemory: Record<string, EntityData>;
  topicHistory: string[];
  userPreferences: UserPreferences;
  contextWindow: number;
}

export interface EntityData {
  type: string;
  count: number;
  firstMentioned: number;
  lastMentioned: number;
}

export interface UserPreferences {
  expertiseLevel: 'novice' | 'intermediate' | 'expert';
  preferredFormat: 'concise' | 'detailed' | 'technical';
  domains: string[];
  analysisDepth: 'basic' | 'intermediate' | 'advanced';
  visualizations: boolean;
  notifications: boolean;
}

export interface ToolState {
  lastUsed: number;
  configuration: any;
  results: any[];
  errors: any[];
  metrics: {
    invocations: number;
    successRate: number;
    avgDuration: number;
  };
}

export interface ExecutionState {
  currentNode: string;
  nodeHistory: string[];
  branchingHistory: any[];
  variables: Record<string, any>;
  pendingActions: WorkflowAction[];
  completedActions: WorkflowAction[];
}

export interface WorkflowAction {
  id: string;
  type: string;
  description: string;
  parameters: any;
  result?: any;
  timestamp: number;
  duration: number;
  success: boolean;
  error?: string;
  metadata: any;
}

export interface WorkflowMetrics {
  startTime: number;
  endTime?: number;
  duration: number;
  tokensUsed: number;
  apiCalls: number;
  cacheHits: number;
  toolInvocations: number;
  errorCount: number;
}

export interface UserInteraction {
  id: string;
  type: 'click' | 'hover' | 'select' | 'zoom' | 'rotate' | 'pan' | 'load' | 'analyze';
  timestamp: number;
  data: {
    structureId?: string;
    atomId?: string;
    residueId?: string;
    chainId?: string;
    position?: [number, number, number];
    viewMatrix?: number[];
    zoomLevel?: number;
    selection?: string;
    duration?: number;
    metadata?: Record<string, any>;
  };
  context: {
    sessionId: string;
    userId: string;
    activeStructures: string[];
    currentView: string;
  };
}

export interface AutoSaveConfig {
  enabled: boolean;
  interval: number;
  debounceTime: number;
  maxRetries: number;
  criticalDataPriority: boolean;
}

export interface SessionRestorationOptions {
  restoreChat: boolean;
  restoreViewer: boolean;
  restoreAIWorkflow: boolean;
  restorePreferences: boolean;
  createSnapshot: boolean;
  validateIntegrity: boolean;
  fallbackToLastKnownGood: boolean;
  progressCallback?: (progress: number, status: string) => void;
}

export interface SessionRestorationResult {
  success: boolean;
  sessionId: string | null;
  restored: {
    chat: boolean;
    viewer: boolean;
    aiWorkflow: boolean;
    preferences: boolean;
  };
  errors: string[];
  warnings: string[];
  metadata: {
    restorationTime: number;
    dataSize: number;
    integrityIssues: string[];
    snapshotCreated: boolean;
  };
}

export interface OfflineSyncOperation {
  id: string;
  userId: string;
  sessionId?: string;
  operation: {
    type: string;
    target: string;
    data: any;
    timestamp: number;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: number;
  lastAttempt?: number;
  error?: string;
}

export interface SessionAnalytics {
  timeRange: 'day' | 'week' | 'month' | 'all';
  sessions: {
    total: number;
    active: number;
    withTags: number;
    avgMessageCount: number;
  };
  messages: {
    total: number;
    userMessages: number;
    assistantMessages: number;
    avgPerSession: number;
  };
  viewerSessions: {
    total: number;
    withStructures: number;
    avgStructuresPerSession: number;
    totalInteractions: number;
  };
  snapshots: {
    total: number;
    auto: number;
    manual: number;
    checkpoints: number;
    totalSize: number;
  };
}

export interface SessionIntegrityResult {
  isValid: boolean;
  issues: Array<{
    type: string;
    severity: 'error' | 'warning' | 'info';
    description: string;
    expectedValue?: any;
    actualValue?: any;
  }>;
  stats: {
    messageCount: number;
    viewerSessionCount: number;
    snapshotCount: number;
    lastUpdated: number;
    lastAccessed: number;
  };
}

export interface SessionCleanupOptions {
  olderThanDays: number;
  removeEmptySessions: boolean;
  cleanupSnapshots: boolean;
  cleanupOfflineQueue: boolean;
  cleanupWorkflows: boolean;
  dryRun: boolean;
}

export interface SessionCleanupResult {
  sessionsDeleted: number;
  snapshotsDeleted: number;
  offlineOperationsDeleted: number;
  workflowsDeleted: number;
  bytesFreed: number;
  errors: string[];
}

// Extended chat types with session persistence
export interface EnhancedChatSession extends SessionMetadata {
  aiWorkflowState?: AIWorkflowState;
  viewerState?: SerializableViewerState;
  snapshots: SessionSnapshot[];
  integrityStatus: SessionIntegrityResult;
}

export interface EnhancedChatMessage {
  id: string;
  content: string;
  timestamp: number;
  userId: string;
  sessionId: string;
  type: 'user' | 'assistant' | 'system';
  status: 'sending' | 'sent' | 'error';
  metadata?: {
    error?: string;
    processingTime?: number;
    tokenCount?: number;
    workflowId?: string;
    snapshotId?: string;
    autoSaved?: boolean;
  };
}

// Hook return types
export interface SessionPersistenceHookReturn {
  state: SessionPersistenceState;
  actions: {
    enableAutoSave: () => void;
    disableAutoSave: () => void;
    forceSave: () => Promise<void>;
    createSnapshot: (type: 'manual' | 'checkpoint', description?: string) => Promise<void>;
    restoreFromSnapshot: (snapshotId: string) => Promise<void>;
    updateViewerState: (viewerState: Partial<SerializableViewerState>) => void;
    updateChatState: (chatState: Partial<SessionSnapshotData['chatState']>) => void;
    updateAIWorkflowState: (aiState: Partial<AIWorkflowState>) => void;
    recordInteraction: (interaction: UserInteraction) => void;
    validateSessionIntegrity: () => Promise<void>;
    repairSession: (repairOptions: any) => Promise<void>;
    exportSession: (format: 'json' | 'backup') => Promise<string>;
    importSession: (data: string, format: 'json' | 'backup') => Promise<void>;
    clearSession: () => Promise<void>;
  };
  config: AutoSaveConfig;
  updateConfig: (config: Partial<AutoSaveConfig>) => void;
}

export interface SessionSnapshotsHookReturn {
  snapshots: SessionSnapshot[];
  stats: {
    total: number;
    auto: number;
    manual: number;
    checkpoint: number;
    recoverable: number;
    expired: number;
    totalSize: number;
  };
  actions: {
    createCheckpoint: (description: string, tags?: string[]) => Promise<string>;
    deleteSnapshot: (snapshotId: string) => Promise<void>;
    cleanupExpired: () => Promise<number>;
  };
}

export interface SessionAnalyticsHookReturn {
  analytics: SessionAnalytics;
  isLoading: boolean;
}