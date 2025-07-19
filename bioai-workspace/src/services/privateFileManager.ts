import { PrivateFile, FileUploadProgress, FileUploadOptions } from '../types/advanced';
import { v4 as uuidv4 } from 'uuid';

export class PrivateFileManager {
  private files: Map<string, PrivateFile> = new Map();
  private uploadProgress: Map<string, FileUploadProgress> = new Map();
  private maxFileSize = 100 * 1024 * 1024; // 100MB
  private allowedTypes = [
    'application/octet-stream', // PDB files
    'text/plain', // PDB files
    'chemical/x-pdb', // PDB files
    'chemical/x-mmcif', // mmCIF files
    'application/pdf',
    'text/csv',
    'application/json',
    'image/png',
    'image/jpeg',
    'image/svg+xml'
  ];

  async uploadFile(
    file: File,
    userId: string,
    options: FileUploadOptions
  ): Promise<string> {
    // Validate file
    this.validateFile(file);

    const fileId = uuidv4();
    const timestamp = Date.now();

    // Initialize progress tracking
    const progress: FileUploadProgress = {
      fileId,
      fileName: file.name,
      progress: 0,
      stage: 'uploading',
      estimatedTimeRemaining: 0
    };
    this.uploadProgress.set(fileId, progress);

    try {
      // Process file upload
      const processedFile = await this.processFile(file, fileId, userId, options);
      
      // Store file metadata
      this.files.set(fileId, processedFile);
      
      // Update progress
      progress.progress = 100;
      progress.stage = 'completed';
      this.uploadProgress.set(fileId, progress);

      return fileId;
    } catch (error) {
      progress.stage = 'failed';
      progress.error = error instanceof Error ? error.message : 'Upload failed';
      this.uploadProgress.set(fileId, progress);
      throw error;
    }
  }

  private validateFile(file: File): void {
    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds maximum limit of ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    if (!this.allowedTypes.includes(file.type) && !this.isValidPDBFile(file)) {
      throw new Error(`File type ${file.type} is not supported`);
    }
  }

  private isValidPDBFile(file: File): boolean {
    // Check if file extension suggests PDB format
    const pdbExtensions = ['.pdb', '.ent', '.cif', '.mmcif'];
    return pdbExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  }

  private async processFile(
    file: File,
    fileId: string,
    userId: string,
    options: FileUploadOptions
  ): Promise<PrivateFile> {
    const progress = this.uploadProgress.get(fileId)!;
    
    // Update progress
    progress.progress = 20;
    progress.stage = 'processing';
    this.uploadProgress.set(fileId, progress);

    // Read file content
    const fileContent = await this.readFileContent(file);
    
    // Update progress
    progress.progress = 40;
    this.uploadProgress.set(fileId, progress);

    // Analyze file structure if it's a PDB file
    let structure = undefined;
    if (this.isPDBFile(file)) {
      structure = await this.analyzePDBStructure(fileContent);
    }

    // Update progress
    progress.progress = 60;
    this.uploadProgress.set(fileId, progress);

    // Generate thumbnail if applicable
    let thumbnailUrl = undefined;
    if (file.type.startsWith('image/')) {
      thumbnailUrl = await this.generateThumbnail(file);
    }

    // Update progress
    progress.progress = 80;
    this.uploadProgress.set(fileId, progress);

    // Create download URL (in a real implementation, this would be a secure URL)
    const downloadUrl = URL.createObjectURL(file);

    // Create file record
    const privateFile: PrivateFile = {
      id: fileId,
      userId,
      name: this.generateSecureFileName(file.name),
      originalName: file.name,
      size: file.size,
      type: file.type,
      mimeType: file.type,
      uploadedAt: Date.now(),
      lastModified: file.lastModified,
      metadata: {
        description: options.description,
        tags: options.tags,
        category: options.category,
        isPrivate: options.isPrivate,
        accessLevel: 'owner',
        processingStatus: 'completed'
      },
      structure,
      thumbnailUrl,
      downloadUrl,
      expiresAt: options.isPrivate ? Date.now() + (30 * 24 * 60 * 60 * 1000) : undefined // 30 days
    };

    return privateFile;
  }

  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private isPDBFile(file: File): boolean {
    return file.type === 'chemical/x-pdb' || 
           file.name.toLowerCase().endsWith('.pdb') ||
           file.name.toLowerCase().endsWith('.ent') ||
           file.name.toLowerCase().endsWith('.cif') ||
           file.name.toLowerCase().endsWith('.mmcif');
  }

  private async analyzePDBStructure(content: string): Promise<PrivateFile['structure']> {
    const lines = content.split('\n');
    const chains = new Set<string>();
    let residueCount = 0;
    let atomCount = 0;
    let resolution = undefined;
    let method = undefined;

    for (const line of lines) {
      if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
        const chainId = line.charAt(21);
        if (chainId && chainId !== ' ') {
          chains.add(chainId);
        }
        atomCount++;
      } else if (line.startsWith('REMARK   2 RESOLUTION.')) {
        const match = line.match(/(\d+\.\d+)/);
        if (match) {
          resolution = parseFloat(match[1]);
        }
      } else if (line.startsWith('EXPDTA')) {
        method = line.substring(10).trim();
      }
    }

    // Estimate residue count (rough approximation)
    residueCount = Math.floor(atomCount / 10);

    return {
      format: 'PDB',
      chains: Array.from(chains),
      residueCount,
      atomCount,
      resolution,
      method
    };
  }

  private async generateThumbnail(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        // Set thumbnail size
        const maxSize = 200;
        const ratio = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        // Draw and convert to data URL
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Failed to generate thumbnail'));
      img.src = URL.createObjectURL(file);
    });
  }

  private generateSecureFileName(originalName: string): string {
    const extension = originalName.split('.').pop();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}_${random}.${extension}`;
  }

  getFile(fileId: string): PrivateFile | null {
    return this.files.get(fileId) || null;
  }

  getUserFiles(userId: string): PrivateFile[] {
    return Array.from(this.files.values()).filter(file => file.userId === userId);
  }

  getFilesByCategory(userId: string, category: string): PrivateFile[] {
    return this.getUserFiles(userId).filter(file => file.metadata.category === category);
  }

  searchFiles(userId: string, query: string): PrivateFile[] {
    const userFiles = this.getUserFiles(userId);
    const lowerQuery = query.toLowerCase();
    
    return userFiles.filter(file => 
      file.originalName.toLowerCase().includes(lowerQuery) ||
      file.metadata.description?.toLowerCase().includes(lowerQuery) ||
      file.metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  updateFile(fileId: string, updates: Partial<PrivateFile>): boolean {
    const file = this.files.get(fileId);
    if (!file) return false;

    const updatedFile = { ...file, ...updates };
    this.files.set(fileId, updatedFile);
    return true;
  }

  deleteFile(fileId: string): boolean {
    const file = this.files.get(fileId);
    if (!file) return false;

    // Cleanup URLs
    if (file.downloadUrl) {
      URL.revokeObjectURL(file.downloadUrl);
    }
    if (file.thumbnailUrl && file.thumbnailUrl.startsWith('blob:')) {
      URL.revokeObjectURL(file.thumbnailUrl);
    }

    return this.files.delete(fileId);
  }

  getUploadProgress(fileId: string): FileUploadProgress | null {
    return this.uploadProgress.get(fileId) || null;
  }

  getAllUploadProgress(): FileUploadProgress[] {
    return Array.from(this.uploadProgress.values());
  }

  cleanupExpiredFiles(): number {
    const now = Date.now();
    let deleted = 0;

    for (const [fileId, file] of this.files.entries()) {
      if (file.expiresAt && file.expiresAt < now) {
        this.deleteFile(fileId);
        deleted++;
      }
    }

    return deleted;
  }

  getStorageUsage(userId: string): {
    totalFiles: number;
    totalSize: number;
    byCategory: Record<string, { count: number; size: number }>;
  } {
    const userFiles = this.getUserFiles(userId);
    const byCategory: Record<string, { count: number; size: number }> = {};

    let totalSize = 0;
    for (const file of userFiles) {
      totalSize += file.size;
      
      const category = file.metadata.category;
      if (!byCategory[category]) {
        byCategory[category] = { count: 0, size: 0 };
      }
      byCategory[category].count++;
      byCategory[category].size += file.size;
    }

    return {
      totalFiles: userFiles.length,
      totalSize,
      byCategory
    };
  }

  validateFileIntegrity(fileId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const file = this.files.get(fileId);
      if (!file) {
        resolve(false);
        return;
      }

      // In a real implementation, this would verify file checksums
      // For now, just check if the download URL is still valid
      if (file.downloadUrl) {
        fetch(file.downloadUrl, { method: 'HEAD' })
          .then(() => resolve(true))
          .catch(() => resolve(false));
      } else {
        resolve(false);
      }
    });
  }

  exportFileMetadata(userId: string): any[] {
    const userFiles = this.getUserFiles(userId);
    return userFiles.map(file => ({
      id: file.id,
      name: file.originalName,
      size: file.size,
      type: file.type,
      category: file.metadata.category,
      tags: file.metadata.tags,
      uploadedAt: file.uploadedAt,
      structure: file.structure
    }));
  }

  async generateShareLink(fileId: string, expiresIn: number = 24 * 60 * 60 * 1000): Promise<string> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    if (!file.metadata.isPrivate) {
      throw new Error('File is not private');
    }

    // Generate a secure share token
    const shareToken = uuidv4();
    const expiresAt = Date.now() + expiresIn;

    // In a real implementation, this would be stored securely
    const shareLink = `${window.location.origin}/shared/${shareToken}`;

    return shareLink;
  }

  bulkUpload(files: File[], userId: string, options: FileUploadOptions): Promise<string[]> {
    return Promise.all(
      files.map(file => this.uploadFile(file, userId, options))
    );
  }

  getFileStats(): {
    totalFiles: number;
    totalSize: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
  } {
    const allFiles = Array.from(this.files.values());
    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let totalSize = 0;

    for (const file of allFiles) {
      totalSize += file.size;
      byType[file.type] = (byType[file.type] || 0) + 1;
      byCategory[file.metadata.category] = (byCategory[file.metadata.category] || 0) + 1;
    }

    return {
      totalFiles: allFiles.length,
      totalSize,
      byType,
      byCategory
    };
  }
}

export const privateFileManager = new PrivateFileManager();