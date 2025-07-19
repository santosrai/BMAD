import { useState, useCallback, useEffect } from 'react';
import type { 
  ExportJob, 
  ExportResult, 
  // ExportSettings, 
  PDBExportOptions, 
  ImageExportOptions, 
  ConversationExportOptions, 
  BatchExportOptions,
  ExportHistory
} from '../types/export';
import { exportManager } from '../services/exportManager';
import { useAuth } from './useAuth';

export function useExport() {
  const [activeJobs, setActiveJobs] = useState<ExportJob[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const { userId } = useAuth();

  const refreshActiveJobs = useCallback(async () => {
    try {
      const jobs = await exportManager.getActiveJobs();
      setActiveJobs(jobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh active jobs');
    }
  }, []);

  const exportPDB = useCallback(async (
    pdbData: string,
    options: PDBExportOptions,
    filename?: string
  ): Promise<ExportResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await exportManager.exportPDB(pdbData, options, filename);
      await refreshActiveJobs();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export PDB';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [refreshActiveJobs]);

  const exportImage = useCallback(async (
    canvasElement: HTMLCanvasElement,
    options: ImageExportOptions,
    filename?: string
  ): Promise<ExportResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await exportManager.exportImage(canvasElement, options, filename);
      await refreshActiveJobs();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export image';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [refreshActiveJobs]);

  const exportConversation = useCallback(async (
    conversationData: any[],
    options: ConversationExportOptions,
    filename?: string
  ): Promise<ExportResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await exportManager.exportConversation(conversationData, options, filename);
      await refreshActiveJobs();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export conversation';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [refreshActiveJobs]);

  const exportBatch = useCallback(async (
    options: BatchExportOptions
  ): Promise<ExportResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await exportManager.exportBatch(options);
      await refreshActiveJobs();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export batch';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [refreshActiveJobs]);

  const cancelJob = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      const result = await exportManager.cancelJob(jobId);
      await refreshActiveJobs();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel job');
      return false;
    }
  }, [refreshActiveJobs]);

  const downloadFile = useCallback((url: string, filename: string) => {
    exportManager.downloadFile(url, filename);
  }, []);

  const cleanupJob = useCallback((jobId: string) => {
    exportManager.cleanupJob(jobId);
    refreshActiveJobs();
  }, [refreshActiveJobs]);

  useEffect(() => {
    refreshActiveJobs();
  }, [refreshActiveJobs]);

  useEffect(() => {
    const interval = setInterval(refreshActiveJobs, 2000);
    return () => clearInterval(interval);
  }, [refreshActiveJobs]);

  return {
    activeJobs,
    exportHistory,
    isLoading,
    error,
    exportPDB,
    exportImage,
    exportConversation,
    exportBatch,
    cancelJob,
    downloadFile,
    cleanupJob,
    refreshActiveJobs,
    clearError: () => setError(null)
  };
}

export function useExportQueue() {
  const [queuedJobs, setQueuedJobs] = useState<ExportJob[]>([]);
  const [completedJobs, setCompletedJobs] = useState<ExportJob[]>([]);
  const [failedJobs, setFailedJobs] = useState<ExportJob[]>([]);

  const { activeJobs } = useExport();

  useEffect(() => {
    const queued = activeJobs.filter(job => job.status === 'pending');
    const completed = activeJobs.filter(job => job.status === 'completed');
    const failed = activeJobs.filter(job => job.status === 'failed');

    setQueuedJobs(queued);
    setCompletedJobs(completed);
    setFailedJobs(failed);
  }, [activeJobs]);

  const totalJobs = activeJobs.length;
  const processingJobs = activeJobs.filter(job => job.status === 'processing');
  const queueProgress = totalJobs > 0 ? (completedJobs.length / totalJobs) * 100 : 0;

  return {
    queuedJobs,
    completedJobs,
    failedJobs,
    processingJobs,
    totalJobs,
    queueProgress
  };
}

export function useExportTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDefaultTemplates = useCallback(() => {
    return [
      {
        id: 'pdb-standard',
        name: 'Standard PDB Export',
        description: 'Standard PDB export with metadata',
        type: 'pdb',
        defaultSettings: {
          format: { name: 'PDB', extension: 'pdb', mimeType: 'chemical/x-pdb' },
          includeMetadata: true,
          includeSelections: true,
          includeModifications: true,
          includeWaterMolecules: false,
          includeHydrogens: false
        },
        isDefault: true
      },
      {
        id: 'image-high-quality',
        name: 'High Quality Image',
        description: 'High resolution image export for publications',
        type: 'image',
        defaultSettings: {
          format: { name: 'PNG', extension: 'png', mimeType: 'image/png' },
          quality: 'high',
          width: 1920,
          height: 1080,
          backgroundColor: '#ffffff',
          transparent: false,
          includeAnnotations: true,
          includeLabels: true
        },
        isDefault: true
      },
      {
        id: 'conversation-json',
        name: 'Conversation JSON',
        description: 'Complete conversation export in JSON format',
        type: 'conversation',
        defaultSettings: {
          format: { name: 'JSON', extension: 'json', mimeType: 'application/json' },
          includeAIResponses: true,
          includeUserMessages: true,
          includeMolecularContext: true,
          includeTimestamps: true
        },
        isDefault: true
      }
    ];
  }, []);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const defaultTemplates = getDefaultTemplates();
      setTemplates(defaultTemplates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  }, [getDefaultTemplates]);

  const getTemplate = useCallback((templateId: string) => {
    return templates.find(template => template.id === templateId);
  }, [templates]);

  const getTemplatesByType = useCallback((type: string) => {
    return templates.filter(template => template.type === type);
  }, [templates]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    isLoading,
    error,
    getTemplate,
    getTemplatesByType,
    loadTemplates
  };
}

export function useExportProgress(jobId: string) {
  const [job, setJob] = useState<ExportJob | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<ExportJob['status']>('pending');

  useEffect(() => {
    if (!jobId) return;

    const updateJob = async () => {
      try {
        const currentJob = await exportManager.getJob(jobId);
        if (currentJob) {
          setJob(currentJob);
          setProgress(currentJob.progress);
          setStatus(currentJob.status);
        }
      } catch (err) {
        console.error('Failed to update job status:', err);
      }
    };

    updateJob();
    const interval = setInterval(updateJob, 1000);

    return () => clearInterval(interval);
  }, [jobId]);

  return {
    job,
    progress,
    status,
    isCompleted: status === 'completed',
    isFailed: status === 'failed',
    isProcessing: status === 'processing',
    isPending: status === 'pending',
    isCancelled: status === 'cancelled'
  };
}

export function useExportValidation() {
  const validatePDBData = useCallback((pdbData: string) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!pdbData.trim()) {
      errors.push('PDB data is empty');
      return { valid: false, errors, warnings };
    }

    const lines = pdbData.split('\n');
    let hasAtomRecords = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
        hasAtomRecords = true;
        
        if (line.length < 80) {
          warnings.push(`Line ${i + 1}: PDB record shorter than standard length`);
        }
      }
    }

    if (!hasAtomRecords) {
      errors.push('No atom records found in PDB data');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }, []);

  const validateImageOptions = useCallback((options: ImageExportOptions) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (options.width && options.width < 1) {
      errors.push('Width must be greater than 0');
    }

    if (options.height && options.height < 1) {
      errors.push('Height must be greater than 0');
    }

    if (options.width && options.width > 8192) {
      warnings.push('Width is very large and may cause performance issues');
    }

    if (options.height && options.height > 8192) {
      warnings.push('Height is very large and may cause performance issues');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }, []);

  const validateConversationData = useCallback((data: any[]) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(data)) {
      errors.push('Conversation data must be an array');
      return { valid: false, errors, warnings };
    }

    if (data.length === 0) {
      warnings.push('Conversation data is empty');
    }

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      
      if (!item.role) {
        errors.push(`Message ${i + 1}: Missing role field`);
      }

      if (!item.content) {
        warnings.push(`Message ${i + 1}: Missing content field`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }, []);

  return {
    validatePDBData,
    validateImageOptions,
    validateConversationData
  };
}