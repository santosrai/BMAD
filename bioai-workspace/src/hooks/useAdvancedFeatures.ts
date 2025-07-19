import { useState, useEffect, useCallback } from 'react';
import { AdvancedSettings, AdvancedFeatureState, AdvancedFeatureKey } from '../types/advanced';
import { keyboardShortcutManager } from '../utils/keyboardShortcuts';

export function useAdvancedFeatures(userId: string) {
  const [features, setFeatures] = useState<Record<AdvancedFeatureKey, AdvancedFeatureState>>({
    modelSwitching: { isEnabled: true, hasAccess: true, isLoading: false, lastUpdated: Date.now() },
    privateFiles: { isEnabled: true, hasAccess: true, isLoading: false, lastUpdated: Date.now() },
    workspaceCustomization: { isEnabled: true, hasAccess: true, isLoading: false, lastUpdated: Date.now() },
    keyboardShortcuts: { isEnabled: true, hasAccess: true, isLoading: false, lastUpdated: Date.now() },
    commandPalette: { isEnabled: true, hasAccess: true, isLoading: false, lastUpdated: Date.now() },
    advancedSearch: { isEnabled: true, hasAccess: true, isLoading: false, lastUpdated: Date.now() },
    performanceMonitoring: { isEnabled: true, hasAccess: true, isLoading: false, lastUpdated: Date.now() },
    exportTemplates: { isEnabled: true, hasAccess: true, isLoading: false, lastUpdated: Date.now() },
    externalIntegrations: { isEnabled: true, hasAccess: true, isLoading: false, lastUpdated: Date.now() },
    workspaceTemplates: { isEnabled: true, hasAccess: true, isLoading: false, lastUpdated: Date.now() },
    customThemes: { isEnabled: true, hasAccess: true, isLoading: false, lastUpdated: Date.now() },
    advancedAI: { isEnabled: true, hasAccess: true, isLoading: false, lastUpdated: Date.now() },
    batchOperations: { isEnabled: true, hasAccess: true, isLoading: false, lastUpdated: Date.now() },
    automatedWorkflows: { isEnabled: true, hasAccess: true, isLoading: false, lastUpdated: Date.now() }
  });

  const [settings, setSettings] = useState<AdvancedSettings | null>(null);

  const toggleFeature = useCallback((featureKey: AdvancedFeatureKey) => {
    setFeatures(prev => ({
      ...prev,
      [featureKey]: {
        ...prev[featureKey],
        isEnabled: !prev[featureKey].isEnabled,
        lastUpdated: Date.now()
      }
    }));
  }, []);

  const updateFeature = useCallback((featureKey: AdvancedFeatureKey, updates: Partial<AdvancedFeatureState>) => {
    setFeatures(prev => ({
      ...prev,
      [featureKey]: {
        ...prev[featureKey],
        ...updates,
        lastUpdated: Date.now()
      }
    }));
  }, []);

  const hasFeature = useCallback((featureKey: AdvancedFeatureKey) => {
    const feature = features[featureKey];
    return feature && feature.isEnabled && feature.hasAccess;
  }, [features]);

  const isFeatureLoading = useCallback((featureKey: AdvancedFeatureKey) => {
    return features[featureKey]?.isLoading || false;
  }, [features]);

  const getFeatureError = useCallback((featureKey: AdvancedFeatureKey) => {
    return features[featureKey]?.error || null;
  }, [features]);

  const loadSettings = useCallback(async () => {
    try {
      // In a real implementation, this would load from Convex
      const mockSettings: AdvancedSettings = {
        userId,
        workspace: {
          theme: 'default',
          layout: 'default',
          template: 'research',
          customizations: {}
        },
        ai: {
          defaultModel: 'claude-3-sonnet',
          customParameters: {},
          systemPrompt: '',
          autoSwitch: false,
          contextPreservation: true
        },
        files: {
          defaultPrivacy: 'private',
          autoProcessing: true,
          retentionPolicy: {
            enabled: true,
            days: 30,
            autoDelete: false
          },
          uploadPreferences: {
            compression: true,
            thumbnails: true,
            metadata: true
          }
        },
        performance: {
          profile: 'balanced',
          monitoring: true,
          alerts: true,
          optimization: {
            autoOptimize: true,
            level: 'balanced'
          }
        },
        integrations: {
          enabled: ['pymol', 'chimeraX'],
          defaultExports: {},
          webhooks: []
        },
        notifications: {
          email: true,
          browser: true,
          webhooks: false,
          channels: {
            system: true,
            ai: true,
            files: true,
            performance: true,
            integrations: true
          }
        },
        privacy: {
          analyticsEnabled: true,
          crashReporting: true,
          dataSharing: false,
          cookieConsent: true
        },
        shortcuts: keyboardShortcutManager.getAllShortcuts(),
        experimental: {
          features: [],
          betaAccess: false,
          feedbackOptIn: true
        },
        updatedAt: Date.now()
      };

      setSettings(mockSettings);
    } catch (error) {
      console.error('Failed to load advanced settings:', error);
    }
  }, [userId]);

  const updateSettings = useCallback(async (updates: Partial<AdvancedSettings>) => {
    try {
      const newSettings = { ...settings, ...updates, updatedAt: Date.now() };
      setSettings(newSettings);
      // In a real implementation, this would save to Convex
      return true;
    } catch (error) {
      console.error('Failed to update settings:', error);
      return false;
    }
  }, [settings]);

  const resetSettings = useCallback(async () => {
    try {
      await loadSettings();
      return true;
    } catch (error) {
      console.error('Failed to reset settings:', error);
      return false;
    }
  }, [loadSettings]);

  const exportSettings = useCallback(() => {
    if (!settings) return null;
    return JSON.stringify(settings, null, 2);
  }, [settings]);

  const importSettings = useCallback(async (settingsData: string) => {
    try {
      const parsedSettings = JSON.parse(settingsData) as AdvancedSettings;
      setSettings(parsedSettings);
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    // Initialize keyboard shortcuts
    keyboardShortcutManager.startListening();
    return () => keyboardShortcutManager.stopListening();
  }, []);

  return {
    features,
    settings,
    toggleFeature,
    updateFeature,
    hasFeature,
    isFeatureLoading,
    getFeatureError,
    loadSettings,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings
  };
}

export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState({
    cpu: { usage: 0, cores: navigator.hardwareConcurrency || 4 },
    memory: { used: 0, total: 0, percentage: 0 },
    network: { downloadSpeed: 0, uploadSpeed: 0, latency: 0 },
    application: { activeUsers: 1, sessionsCount: 0, messagesCount: 0 }
  });

  const [isMonitoring, setIsMonitoring] = useState(false);

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    
    const interval = setInterval(() => {
      // Simulate performance metrics
      setMetrics(prev => ({
        cpu: {
          usage: Math.random() * 100,
          cores: prev.cpu.cores
        },
        memory: {
          used: Math.random() * 8000,
          total: 8000,
          percentage: Math.random() * 100
        },
        network: {
          downloadSpeed: Math.random() * 100,
          uploadSpeed: Math.random() * 50,
          latency: Math.random() * 100
        },
        application: {
          activeUsers: Math.floor(Math.random() * 10) + 1,
          sessionsCount: Math.floor(Math.random() * 50),
          messagesCount: Math.floor(Math.random() * 1000)
        }
      }));
    }, 1000);

    return () => {
      clearInterval(interval);
      setIsMonitoring(false);
    };
  }, []);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring
  };
}

export function useWorkspaceTemplates() {
  const [templates, setTemplates] = useState([]);
  const [currentTemplate, setCurrentTemplate] = useState('default');
  const [isLoading, setIsLoading] = useState(false);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      // Mock templates
      const mockTemplates = [
        {
          id: 'research',
          name: 'Research',
          description: 'Optimized for scientific research',
          category: 'research',
          isDefault: true
        },
        {
          id: 'education',
          name: 'Education',
          description: 'Simplified interface for learning',
          category: 'education',
          isDefault: false
        },
        {
          id: 'collaboration',
          name: 'Collaboration',
          description: 'Enhanced sharing and collaboration features',
          category: 'collaboration',
          isDefault: false
        }
      ];
      setTemplates(mockTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const applyTemplate = useCallback(async (templateId: string) => {
    setCurrentTemplate(templateId);
    // Implementation would apply template settings
    return true;
  }, []);

  const createTemplate = useCallback(async (template: any) => {
    // Implementation would create new template
    return true;
  }, []);

  const deleteTemplate = useCallback(async (templateId: string) => {
    // Implementation would delete template
    return true;
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    currentTemplate,
    isLoading,
    loadTemplates,
    applyTemplate,
    createTemplate,
    deleteTemplate
  };
}

export function useExternalIntegrations(userId: string) {
  const [integrations, setIntegrations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadIntegrations = useCallback(async () => {
    setIsLoading(true);
    try {
      // Mock integrations
      const mockIntegrations = [
        {
          id: 'pymol',
          name: 'PyMOL',
          status: 'inactive',
          lastUsed: null
        },
        {
          id: 'chimeraX',
          name: 'ChimeraX',
          status: 'active',
          lastUsed: Date.now() - 86400000
        },
        {
          id: 'jupyter',
          name: 'Jupyter Notebooks',
          status: 'inactive',
          lastUsed: null
        }
      ];
      setIntegrations(mockIntegrations);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const enableIntegration = useCallback(async (integrationId: string) => {
    // Implementation would enable integration
    return true;
  }, []);

  const disableIntegration = useCallback(async (integrationId: string) => {
    // Implementation would disable integration
    return true;
  }, []);

  const configureIntegration = useCallback(async (integrationId: string, config: any) => {
    // Implementation would configure integration
    return true;
  }, []);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  return {
    integrations,
    isLoading,
    loadIntegrations,
    enableIntegration,
    disableIntegration,
    configureIntegration
  };
}