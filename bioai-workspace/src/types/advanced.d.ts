// AI Model Management Types
export interface AIModelConfig {
  id: string;
  name: string;
  provider: 'openrouter' | 'anthropic' | 'openai' | 'local';
  modelId: string;
  displayName: string;
  description: string;
  capabilities: string[];
  pricing: {
    inputTokens: number;
    outputTokens: number;
    currency: string;
  };
  limits: {
    maxTokens: number;
    maxContextLength: number;
    rateLimit: number;
  };
  parameters: {
    temperature: { min: number; max: number; default: number };
    topP: { min: number; max: number; default: number };
    maxTokens: { min: number; max: number; default: number };
    topK?: { min: number; max: number; default: number };
    frequencyPenalty?: { min: number; max: number; default: number };
    presencePenalty?: { min: number; max: number; default: number };
  };
  features: {
    streaming: boolean;
    functionCalling: boolean;
    imageInput: boolean;
    codeGeneration: boolean;
    reasoning: boolean;
  };
}

export interface AIModelSession {
  sessionId: string;
  currentModel: string;
  modelHistory: Array<{
    modelId: string;
    timestamp: number;
    messageCount: number;
    switchReason?: string;
  }>;
  customParameters: Record<string, any>;
  systemPrompt?: string;
  conversationContext: any;
}

export interface ModelSwitchOptions {
  preserveContext: boolean;
  migrateConversation: boolean;
  reasonForSwitch: string;
  customParameters?: Record<string, any>;
}

// Private File Management Types
export interface PrivateFile {
  id: string;
  userId: string;
  name: string;
  originalName: string;
  size: number;
  type: string;
  mimeType: string;
  uploadedAt: number;
  lastModified: number;
  metadata: {
    description?: string;
    tags: string[];
    category: 'pdb' | 'document' | 'data' | 'image' | 'other';
    isPrivate: boolean;
    accessLevel: 'owner' | 'shared' | 'public';
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
    processingError?: string;
  };
  structure?: {
    format: string;
    chains: string[];
    residueCount: number;
    atomCount: number;
    resolution?: number;
    method?: string;
  };
  thumbnailUrl?: string;
  downloadUrl?: string;
  expiresAt?: number;
}

export interface FileUploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  stage: 'uploading' | 'processing' | 'validating' | 'completed' | 'failed';
  error?: string;
  estimatedTimeRemaining?: number;
}

export interface FileUploadOptions {
  isPrivate: boolean;
  category: PrivateFile['metadata']['category'];
  description?: string;
  tags: string[];
  autoProcess: boolean;
  notifyOnComplete: boolean;
}

// Workspace Customization Types
export interface WorkspaceTheme {
  id: string;
  name: string;
  displayName: string;
  description: string;
  author: string;
  version: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      small: string;
      medium: string;
      large: string;
      xlarge: string;
    };
    lineHeight: string;
    fontWeight: {
      normal: string;
      medium: string;
      semibold: string;
      bold: string;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  borderRadius: {
    small: string;
    medium: string;
    large: string;
  };
  shadows: {
    small: string;
    medium: string;
    large: string;
  };
  animations: {
    duration: string;
    easing: string;
  };
}

export interface WorkspaceLayout {
  id: string;
  name: string;
  panels: {
    id: string;
    type: 'chat' | 'viewer' | 'files' | 'settings' | 'search' | 'performance' | 'export';
    position: { x: number; y: number; width: number; height: number };
    visible: boolean;
    minimized: boolean;
    settings: Record<string, any>;
  }[];
  gridSize: number;
  snapToGrid: boolean;
  responsive: boolean;
}

export interface WorkspaceTemplate {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: 'research' | 'education' | 'collaboration' | 'analysis' | 'custom';
  layout: WorkspaceLayout;
  theme: string;
  features: {
    enabledFeatures: string[];
    disabledFeatures: string[];
    aiModel: string;
    defaultSettings: Record<string, any>;
  };
  shortcuts: KeyboardShortcut[];
  isDefault: boolean;
  isPublic: boolean;
  author: string;
  createdAt: number;
  updatedAt: number;
  usage: {
    timesUsed: number;
    lastUsed: number;
    averageRating: number;
    reviews: number;
  };
}

// Keyboard Shortcuts and Navigation Types
export interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  category: 'navigation' | 'ai' | 'files' | 'viewer' | 'general' | 'advanced';
  keys: string[];
  modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  action: string;
  context: 'global' | 'chat' | 'viewer' | 'files' | 'settings';
  enabled: boolean;
  customizable: boolean;
  conflictsWith?: string[];
}

export interface CommandPaletteItem {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  keywords: string[];
  action: () => void | Promise<void>;
  shortcut?: string;
  context: string[];
  enabled: boolean;
  priority: number;
}

export interface NavigationState {
  currentView: string;
  viewHistory: string[];
  breadcrumbs: Array<{
    label: string;
    path: string;
    icon?: string;
  }>;
  quickActions: CommandPaletteItem[];
}

// Search and Filtering Types
export interface SearchQuery {
  query: string;
  filters: {
    type: ('message' | 'file' | 'session' | 'structure' | 'workflow')[];
    dateRange: {
      start: Date;
      end: Date;
    };
    author: string[];
    tags: string[];
    category: string[];
    status: string[];
  };
  sorting: {
    field: string;
    direction: 'asc' | 'desc';
  };
  pagination: {
    page: number;
    limit: number;
  };
}

export interface SearchResult {
  id: string;
  type: 'message' | 'file' | 'session' | 'structure' | 'workflow';
  title: string;
  content: string;
  excerpt: string;
  relevanceScore: number;
  metadata: {
    author: string;
    timestamp: number;
    tags: string[];
    category: string;
    url?: string;
  };
  highlights: Array<{
    field: string;
    value: string;
    start: number;
    end: number;
  }>;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: SearchQuery;
  createdAt: number;
  lastUsed: number;
  timesUsed: number;
  isPublic: boolean;
  notifications: boolean;
}

// Performance Monitoring Types
export interface PerformanceMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    cores: number;
    temperature?: number;
  };
  memory: {
    used: number;
    total: number;
    available: number;
    percentage: number;
  };
  network: {
    downloadSpeed: number;
    uploadSpeed: number;
    latency: number;
    requests: number;
  };
  storage: {
    used: number;
    total: number;
    available: number;
    percentage: number;
  };
  browser: {
    version: string;
    engine: string;
    webGL: boolean;
    webGLVersion: string;
    maxTextureSize: number;
  };
  application: {
    version: string;
    buildTime: number;
    activeUsers: number;
    sessionsCount: number;
    messagesCount: number;
    filesCount: number;
  };
}

export interface PerformanceProfile {
  id: string;
  name: string;
  description: string;
  settings: {
    renderQuality: 'low' | 'medium' | 'high' | 'ultra';
    animationsEnabled: boolean;
    backgroundProcessing: boolean;
    cacheStrategy: 'memory' | 'disk' | 'hybrid';
    maxConcurrentRequests: number;
    timeoutDuration: number;
    retryAttempts: number;
    compressionLevel: number;
  };
  thresholds: {
    cpu: number;
    memory: number;
    network: number;
    storage: number;
  };
  optimizations: {
    lazyLoading: boolean;
    imageOptimization: boolean;
    codesplitting: boolean;
    serviceWorker: boolean;
    offlineMode: boolean;
  };
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  metric: string;
  threshold: number;
  currentValue: number;
  message: string;
  recommendation: string;
  timestamp: number;
  acknowledged: boolean;
  resolved: boolean;
}

// External Tool Integration Types
export interface ExternalTool {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: 'analysis' | 'visualization' | 'database' | 'computation' | 'collaboration';
  provider: string;
  version: string;
  icon?: string;
  website?: string;
  documentation?: string;
  authentication: {
    type: 'none' | 'api_key' | 'oauth' | 'basic' | 'custom';
    required: boolean;
    fields: Array<{
      name: string;
      type: string;
      label: string;
      required: boolean;
      sensitive: boolean;
    }>;
  };
  capabilities: {
    import: boolean;
    export: boolean;
    analysis: boolean;
    visualization: boolean;
    realtime: boolean;
    batch: boolean;
  };
  supportedFormats: string[];
  endpoints: {
    base: string;
    auth?: string;
    upload?: string;
    download?: string;
    status?: string;
    webhook?: string;
  };
  rateLimit: {
    requests: number;
    period: string;
    burst: number;
  };
}

export interface ToolIntegration {
  id: string;
  userId: string;
  toolId: string;
  name: string;
  isEnabled: boolean;
  configuration: {
    credentials: Record<string, string>;
    settings: Record<string, any>;
    webhooks: Array<{
      event: string;
      url: string;
      secret?: string;
    }>;
  };
  usage: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    lastUsed: number;
    averageResponseTime: number;
  };
  status: 'active' | 'inactive' | 'error' | 'rate_limited';
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}

export interface IntegrationWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'manual' | 'scheduled' | 'webhook' | 'file_upload' | 'analysis_complete';
    configuration: Record<string, any>;
  };
  steps: Array<{
    id: string;
    type: 'transform' | 'analysis' | 'export' | 'notification' | 'api_call';
    tool?: string;
    configuration: Record<string, any>;
    retryPolicy: {
      maxRetries: number;
      backoffStrategy: 'linear' | 'exponential';
      delay: number;
    };
  }>;
  isActive: boolean;
  schedule?: {
    type: 'cron' | 'interval';
    expression: string;
    timezone: string;
  };
  notifications: {
    onSuccess: boolean;
    onFailure: boolean;
    channels: ('email' | 'webhook' | 'ui')[];
  };
  createdAt: number;
  updatedAt: number;
}

// Advanced Settings Types
export interface AdvancedSettings {
  userId: string;
  workspace: {
    theme: string;
    layout: string;
    template: string;
    customizations: Record<string, any>;
  };
  ai: {
    defaultModel: string;
    customParameters: Record<string, any>;
    systemPrompt?: string;
    autoSwitch: boolean;
    contextPreservation: boolean;
  };
  files: {
    defaultPrivacy: 'private' | 'shared' | 'public';
    autoProcessing: boolean;
    retentionPolicy: {
      enabled: boolean;
      days: number;
      autoDelete: boolean;
    };
    uploadPreferences: {
      compression: boolean;
      thumbnails: boolean;
      metadata: boolean;
    };
  };
  performance: {
    profile: string;
    monitoring: boolean;
    alerts: boolean;
    optimization: {
      autoOptimize: boolean;
      level: 'conservative' | 'balanced' | 'aggressive';
    };
  };
  integrations: {
    enabled: string[];
    defaultExports: Record<string, any>;
    webhooks: Array<{
      event: string;
      url: string;
      enabled: boolean;
    }>;
  };
  notifications: {
    email: boolean;
    browser: boolean;
    webhooks: boolean;
    channels: {
      system: boolean;
      ai: boolean;
      files: boolean;
      performance: boolean;
      integrations: boolean;
    };
  };
  privacy: {
    analyticsEnabled: boolean;
    crashReporting: boolean;
    dataSharing: boolean;
    cookieConsent: boolean;
  };
  shortcuts: KeyboardShortcut[];
  experimental: {
    features: string[];
    betaAccess: boolean;
    feedbackOptIn: boolean;
  };
  updatedAt: number;
}

// Utility Types
export interface AdvancedFeatureState {
  isEnabled: boolean;
  hasAccess: boolean;
  isLoading: boolean;
  error?: string;
  lastUpdated: number;
}

export interface AdvancedFeatureConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  requiresAuth: boolean;
  requiresPremium: boolean;
  dependencies: string[];
  incompatibleWith: string[];
  defaultEnabled: boolean;
  experimental: boolean;
}

export type AdvancedFeatureKey = 
  | 'modelSwitching'
  | 'privateFiles'
  | 'workspaceCustomization'
  | 'keyboardShortcuts'
  | 'commandPalette'
  | 'advancedSearch'
  | 'performanceMonitoring'
  | 'exportTemplates'
  | 'externalIntegrations'
  | 'workspaceTemplates'
  | 'customThemes'
  | 'advancedAI'
  | 'batchOperations'
  | 'automatedWorkflows';