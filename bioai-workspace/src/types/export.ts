export interface ExportFormat {
  name: string;
  extension: string;
  mimeType: string;
  description: string;
}

export interface ExportSettings {
  format: ExportFormat;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  resolution?: number;
  includeMetadata?: boolean;
  includeTimestamps?: boolean;
  customFilename?: string;
}

export interface PDBExportOptions extends ExportSettings {
  includeSelections?: boolean;
  includeModifications?: boolean;
  includeWaterMolecules?: boolean;
  includeHydrogens?: boolean;
}

export interface ImageExportOptions extends ExportSettings {
  width?: number;
  height?: number;
  backgroundColor?: string;
  transparent?: boolean;
  includeAnnotations?: boolean;
  includeLabels?: boolean;
}

export interface ConversationExportOptions extends ExportSettings {
  includeAIResponses?: boolean;
  includeMolecularContext?: boolean;
  includeUserMessages?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sessionIds?: string[];
}

export interface ExportJob {
  id: string;
  type: 'pdb' | 'image' | 'conversation' | 'batch';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  filename: string;
  options: ExportSettings;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  downloadUrl?: string;
  fileSize?: number;
}

export interface ExportHistory {
  id: string;
  userId: string;
  jobs: ExportJob[];
  totalExports: number;
  totalSize: number;
  lastExportAt: Date;
}

export interface BatchExportOptions {
  jobs: Array<{
    type: 'pdb' | 'image' | 'conversation';
    options: ExportSettings;
    filename: string;
  }>;
  archiveFormat: 'zip' | 'tar';
  archiveName: string;
}

export interface ExportResult {
  success: boolean;
  jobId: string;
  filename: string;
  fileSize: number;
  downloadUrl?: string;
  error?: string;
}

export interface ExportQueueManager {
  addJob: (job: ExportJob) => Promise<string>;
  getJob: (jobId: string) => Promise<ExportJob | null>;
  cancelJob: (jobId: string) => Promise<boolean>;
  getActiveJobs: () => Promise<ExportJob[]>;
  getJobHistory: (userId: string) => Promise<ExportHistory>;
}

export interface ExportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'pdb' | 'image' | 'conversation';
  defaultSettings: ExportSettings;
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
}

export const EXPORT_FORMATS = {
  PDB: {
    name: 'PDB',
    extension: 'pdb',
    mimeType: 'chemical/x-pdb',
    description: 'Protein Data Bank format'
  },
  PNG: {
    name: 'PNG',
    extension: 'png',
    mimeType: 'image/png',
    description: 'Portable Network Graphics'
  },
  SVG: {
    name: 'SVG',
    extension: 'svg',
    mimeType: 'image/svg+xml',
    description: 'Scalable Vector Graphics'
  },
  PDF: {
    name: 'PDF',
    extension: 'pdf',
    mimeType: 'application/pdf',
    description: 'Portable Document Format'
  },
  JSON: {
    name: 'JSON',
    extension: 'json',
    mimeType: 'application/json',
    description: 'JavaScript Object Notation'
  },
  CSV: {
    name: 'CSV',
    extension: 'csv',
    mimeType: 'text/csv',
    description: 'Comma-Separated Values'
  },
  ZIP: {
    name: 'ZIP',
    extension: 'zip',
    mimeType: 'application/zip',
    description: 'ZIP Archive'
  }
} as const;

export type ExportFormatType = keyof typeof EXPORT_FORMATS;