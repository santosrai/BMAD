import type {
  ExportJob,
  ExportResult,
  ExportSettings,
  PDBExportOptions,
  ImageExportOptions,
  ConversationExportOptions,
  BatchExportOptions,
  ExportValidationResult
} from '../types/export';
import { EXPORT_FORMATS } from '../types/export';
import { v4 as uuidv4 } from 'uuid';

export class ExportManager {
  private activeJobs: Map<string, ExportJob> = new Map();
  private jobQueue: ExportJob[] = [];
  private isProcessing = false;
  private maxConcurrentJobs = 3;

  async exportPDB(
    pdbData: string,
    options: PDBExportOptions,
    filename?: string
  ): Promise<ExportResult> {
    const jobId = uuidv4();
    const job: ExportJob = {
      id: jobId,
      type: 'pdb',
      status: 'pending',
      progress: 0,
      filename: filename || `structure_${Date.now()}.pdb`,
      options,
      createdAt: new Date()
    };

    this.addJobToQueue(job);
    
    try {
      const result = await this.processPDBExport(pdbData, options, job);
      return {
        success: true,
        jobId,
        filename: job.filename,
        fileSize: result.size,
        downloadUrl: result.url
      };
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        jobId,
        filename: job.filename,
        fileSize: 0,
        error: job.error
      };
    }
  }

  async exportImage(
    canvasElement: HTMLCanvasElement,
    options: ImageExportOptions,
    filename?: string
  ): Promise<ExportResult> {
    const jobId = uuidv4();
    const job: ExportJob = {
      id: jobId,
      type: 'image',
      status: 'pending',
      progress: 0,
      filename: filename || `molecular_view_${Date.now()}.${options.format.extension}`,
      options,
      createdAt: new Date()
    };

    this.addJobToQueue(job);
    
    try {
      const result = await this.processImageExport(canvasElement, options, job);
      return {
        success: true,
        jobId,
        filename: job.filename,
        fileSize: result.size,
        downloadUrl: result.url
      };
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        jobId,
        filename: job.filename,
        fileSize: 0,
        error: job.error
      };
    }
  }

  async exportConversation(
    conversationData: any[],
    options: ConversationExportOptions,
    filename?: string
  ): Promise<ExportResult> {
    const jobId = uuidv4();
    const job: ExportJob = {
      id: jobId,
      type: 'conversation',
      status: 'pending',
      progress: 0,
      filename: filename || `conversation_${Date.now()}.${options.format.extension}`,
      options,
      createdAt: new Date()
    };

    this.addJobToQueue(job);
    
    try {
      const result = await this.processConversationExport(conversationData, options, job);
      return {
        success: true,
        jobId,
        filename: job.filename,
        fileSize: result.size,
        downloadUrl: result.url
      };
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        jobId,
        filename: job.filename,
        fileSize: 0,
        error: job.error
      };
    }
  }

  async exportBatch(options: BatchExportOptions): Promise<ExportResult> {
    const jobId = uuidv4();
    const job: ExportJob = {
      id: jobId,
      type: 'batch',
      status: 'pending',
      progress: 0,
      filename: options.archiveName,
      options: {
        format: EXPORT_FORMATS.ZIP,
        includeMetadata: true,
        includeTimestamps: true
      },
      createdAt: new Date()
    };

    this.addJobToQueue(job);
    
    try {
      const result = await this.processBatchExport(options, job);
      return {
        success: true,
        jobId,
        filename: job.filename,
        fileSize: result.size,
        downloadUrl: result.url
      };
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        jobId,
        filename: job.filename,
        fileSize: 0,
        error: job.error
      };
    }
  }

  private addJobToQueue(job: ExportJob): void {
    this.activeJobs.set(job.id, job);
    this.jobQueue.push(job);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.jobQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.jobQueue.length > 0 && this.getActiveJobCount() < this.maxConcurrentJobs) {
      const job = this.jobQueue.shift();
      if (job) {
        this.processJob(job);
      }
    }
    
    this.isProcessing = false;
  }

  private getActiveJobCount(): number {
    return Array.from(this.activeJobs.values()).filter(
      job => job.status === 'processing'
    ).length;
  }

  private async processJob(job: ExportJob): Promise<void> {
    job.status = 'processing';
    job.progress = 0;
    
    try {
      switch (job.type) {
        case 'pdb':
        case 'image':
        case 'conversation':
        case 'batch':
          break;
        default:
          throw new Error(`Unsupported job type: ${job.type}`);
      }
      
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  private async processPDBExport(
    pdbData: string,
    options: PDBExportOptions,
    job: ExportJob
  ): Promise<{ url: string; size: number }> {
    job.progress = 25;
    
    let processedData = pdbData;
    
    if (options.includeMetadata) {
      const metadata = this.generatePDBMetadata(options);
      processedData = metadata + '\n' + processedData;
    }
    
    job.progress = 50;
    
    const validation = this.validatePDBFormat(processedData);
    if (!validation.valid) {
      throw new Error(`PDB validation failed: ${validation.errors.join(', ')}`);
    }
    
    job.progress = 75;
    
    const blob = new Blob([processedData], { type: options.format.mimeType });
    const url = URL.createObjectURL(blob);
    
    job.progress = 100;
    
    return { url, size: blob.size };
  }

  private async processImageExport(
    canvasElement: HTMLCanvasElement,
    options: ImageExportOptions,
    job: ExportJob
  ): Promise<{ url: string; size: number }> {
    job.progress = 25;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    canvas.width = options.width || canvasElement.width;
    canvas.height = options.height || canvasElement.height;
    
    job.progress = 50;
    
    if (options.backgroundColor && !options.transparent) {
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    ctx.drawImage(canvasElement, 0, 0, canvas.width, canvas.height);
    
    job.progress = 75;
    
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            job.progress = 100;
            resolve({ url, size: blob.size });
          } else {
            reject(new Error('Failed to generate image blob'));
          }
        },
        options.format.mimeType,
        options.quality === 'high' ? 0.9 : options.quality === 'medium' ? 0.7 : 0.5
      );
    });
  }

  private async processConversationExport(
    conversationData: any[],
    options: ConversationExportOptions,
    job: ExportJob
  ): Promise<{ url: string; size: number }> {
    job.progress = 25;
    
    let filteredData = conversationData;
    
    if (options.dateRange) {
      filteredData = filteredData.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= options.dateRange!.start && itemDate <= options.dateRange!.end;
      });
    }
    
    job.progress = 50;
    
    if (options.sessionIds?.length) {
      filteredData = filteredData.filter(item => 
        options.sessionIds!.includes(item.sessionId)
      );
    }
    
    job.progress = 75;
    
    let exportData: string;
    let mimeType: string;
    
    switch (options.format.extension) {
      case 'json':
        exportData = JSON.stringify(filteredData, null, 2);
        mimeType = 'application/json';
        break;
      case 'csv':
        exportData = this.convertToCSV(filteredData);
        mimeType = 'text/csv';
        break;
      case 'pdf':
        exportData = await this.generatePDFReport(filteredData);
        mimeType = 'application/pdf';
        break;
      default:
        throw new Error(`Unsupported conversation export format: ${options.format.extension}`);
    }
    
    const blob = new Blob([exportData], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    job.progress = 100;
    
    return { url, size: blob.size };
  }

  private async processBatchExport(
    options: BatchExportOptions,
    job: ExportJob
  ): Promise<{ url: string; size: number }> {
    const JSZip = await import('jszip');
    const zip = new JSZip.default();
    
    let completedJobs = 0;
    const totalJobs = options.jobs.length;
    
    for (const batchJob of options.jobs) {
      try {
        switch (batchJob.type) {
          case 'pdb':
            break;
          case 'image':
            break;
          case 'conversation':
            break;
          default:
            throw new Error(`Unsupported batch job type: ${batchJob.type}`);
        }
        
        completedJobs++;
        job.progress = (completedJobs / totalJobs) * 90;
      } catch (error) {
        console.error(`Failed to process batch job: ${error}`);
      }
    }
    
    job.progress = 95;
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    
    job.progress = 100;
    
    return { url, size: zipBlob.size };
  }

  private generatePDBMetadata(options: PDBExportOptions): string {
    const timestamp = new Date().toISOString();
    return `REMARK   1 EXPORTED FROM BIOAI WORKSPACE
REMARK   1 EXPORT TIMESTAMP: ${timestamp}
REMARK   1 EXPORT OPTIONS: ${JSON.stringify(options)}`;
  }

  private validatePDBFormat(pdbData: string): ExportValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!pdbData.includes('ATOM') && !pdbData.includes('HETATM')) {
      errors.push('No atom records found in PDB data');
    }
    
    const lines = pdbData.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
        if (line.length < 80) {
          warnings.push(`Line ${i + 1}: PDB line shorter than expected (${line.length} characters)`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const item of data) {
      const values = headers.map(header => {
        const value = item[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  private async generatePDFReport(data: any[]): Promise<string> {
    throw new Error('PDF generation not implemented yet');
  }

  async getJob(jobId: string): Promise<ExportJob | null> {
    return this.activeJobs.get(jobId) || null;
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.activeJobs.get(jobId);
    if (job && job.status === 'pending') {
      job.status = 'cancelled';
      this.activeJobs.delete(jobId);
      return true;
    }
    return false;
  }

  async getActiveJobs(): Promise<ExportJob[]> {
    return Array.from(this.activeJobs.values());
  }

  downloadFile(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  cleanupJob(jobId: string): void {
    const job = this.activeJobs.get(jobId);
    if (job?.downloadUrl) {
      URL.revokeObjectURL(job.downloadUrl);
    }
    this.activeJobs.delete(jobId);
  }
}

export const exportManager = new ExportManager();