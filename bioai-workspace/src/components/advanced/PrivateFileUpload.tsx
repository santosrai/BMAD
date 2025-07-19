import React, { useState, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { privateFileManager } from '../../services/privateFileManager';
import { PrivateFile, FileUploadOptions, FileUploadProgress } from '../../types/advanced';
import { Upload, File, X, Eye, Download, Trash2 } from 'lucide-react';

interface PrivateFileUploadProps {
  userId: string;
  onFileUploaded?: (fileId: string, file: PrivateFile) => void;
  onFileDeleted?: (fileId: string) => void;
  maxFiles?: number;
  allowedCategories?: string[];
}

export function PrivateFileUpload({
  userId,
  onFileUploaded,
  onFileDeleted,
  maxFiles = 10,
  allowedCategories = ['pdb', 'document', 'data', 'image', 'other']
}: PrivateFileUploadProps) {
  const [files, setFiles] = useState<PrivateFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>([]);
  const [uploadOptions, setUploadOptions] = useState<FileUploadOptions>({
    isPrivate: true,
    category: 'pdb',
    description: '',
    tags: [],
    autoProcess: true,
    notifyOnComplete: true
  });
  const [isDragging, setIsDragging] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    // Load existing files
    const userFiles = privateFileManager.getUserFiles(userId);
    setFiles(userFiles);
  }, [userId]);

  const handleFileSelect = useCallback((selectedFiles: FileList) => {
    const fileArray = Array.from(selectedFiles);
    
    if (files.length + fileArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    fileArray.forEach(file => uploadFile(file));
  }, [files.length, maxFiles, uploadOptions]);

  const uploadFile = async (file: File) => {
    try {
      const fileId = await privateFileManager.uploadFile(file, userId, uploadOptions);
      
      // Monitor upload progress
      const interval = setInterval(() => {
        const progress = privateFileManager.getUploadProgress(fileId);
        if (progress) {
          setUploadProgress(prev => {
            const existing = prev.find(p => p.fileId === fileId);
            if (existing) {
              return prev.map(p => p.fileId === fileId ? progress : p);
            } else {
              return [...prev, progress];
            }
          });

          if (progress.stage === 'completed') {
            clearInterval(interval);
            const uploadedFile = privateFileManager.getFile(fileId);
            if (uploadedFile) {
              setFiles(prev => [...prev, uploadedFile]);
              onFileUploaded?.(fileId, uploadedFile);
            }
            setUploadProgress(prev => prev.filter(p => p.fileId !== fileId));
          } else if (progress.stage === 'failed') {
            clearInterval(interval);
            setUploadProgress(prev => prev.filter(p => p.fileId !== fileId));
          }
        }
      }, 500);
    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleDeleteFile = (fileId: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      if (privateFileManager.deleteFile(fileId)) {
        setFiles(prev => prev.filter(f => f.id !== fileId));
        onFileDeleted?.(fileId);
      }
    }
  };

  const handleDownloadFile = (file: PrivateFile) => {
    if (file.downloadUrl) {
      const link = document.createElement('a');
      link.href = file.downloadUrl;
      link.download = file.originalName;
      link.click();
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !uploadOptions.tags.includes(tagInput.trim())) {
      setUploadOptions(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setUploadOptions(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (file: PrivateFile) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.metadata.category === 'pdb') return '🧬';
    if (file.type === 'application/pdf') return '📄';
    return '📁';
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'pdb': 'bg-blue-100 text-blue-800',
      'document': 'bg-green-100 text-green-800',
      'data': 'bg-purple-100 text-purple-800',
      'image': 'bg-orange-100 text-orange-800',
      'other': 'bg-gray-100 text-gray-800'
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  const storageUsage = privateFileManager.getStorageUsage(userId);

  return (
    <div className="space-y-6">
      {/* Upload Options */}
      <Card className="p-4">
        <h3 className="font-medium mb-4">Upload Settings</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={uploadOptions.category}
                onChange={(e) => setUploadOptions(prev => ({ ...prev, category: e.target.value as any }))}
                className="w-full p-2 border rounded"
              >
                {allowedCategories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={uploadOptions.isPrivate}
                  onChange={(e) => setUploadOptions(prev => ({ ...prev, isPrivate: e.target.checked }))}
                />
                <span className="text-sm">Private</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={uploadOptions.autoProcess}
                  onChange={(e) => setUploadOptions(prev => ({ ...prev, autoProcess: e.target.checked }))}
                />
                <span className="text-sm">Auto-process</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input
              type="text"
              value={uploadOptions.description}
              onChange={(e) => setUploadOptions(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description"
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tags</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                placeholder="Add tag and press Enter"
                className="flex-1 p-2 border rounded"
              />
              <Button onClick={addTag} size="sm">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {uploadOptions.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="ml-1 text-gray-500 hover:text-gray-700">
                    <X size={12} />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Upload Area */}
      <Card className="p-6">
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium mb-2">
            {isDragging ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-sm text-gray-600 mb-4">
            or click to select files
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={files.length >= maxFiles}
          >
            Select Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
            accept=".pdb,.ent,.cif,.mmcif,.pdf,.csv,.json,.png,.jpg,.jpeg,.svg"
          />
          <p className="text-xs text-gray-500 mt-2">
            Supported: PDB, CIF, PDF, CSV, JSON, Images (max 100MB each)
          </p>
        </div>
      </Card>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium mb-3">Uploading Files</h3>
          <div className="space-y-3">
            {uploadProgress.map(progress => (
              <div key={progress.fileId} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{progress.fileName}</span>
                  <span className="text-sm text-gray-500">{progress.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Status: {progress.stage}</span>
                  {progress.error && <span className="text-red-500">{progress.error}</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Storage Usage */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Storage Usage</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Total Files:</span>
            <span>{storageUsage.totalFiles}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Size:</span>
            <span>{formatFileSize(storageUsage.totalSize)}</span>
          </div>
          <div className="text-sm text-gray-600">
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.entries(storageUsage.byCategory).map(([category, stats]) => (
                <div key={category} className="flex justify-between">
                  <span>{category}:</span>
                  <span>{stats.count} files ({formatFileSize(stats.size)})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* File List */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Your Files ({files.length})</h3>
        {files.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <File className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p>No files uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map(file => (
              <div key={file.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{getFileIcon(file)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{file.originalName}</span>
                      <Badge className={getCategoryColor(file.metadata.category)}>
                        {file.metadata.category}
                      </Badge>
                      {file.metadata.isPrivate && (
                        <Badge variant="outline" className="text-xs">Private</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                    </div>
                    {file.metadata.description && (
                      <p className="text-sm text-gray-600 mt-1">{file.metadata.description}</p>
                    )}
                    {file.metadata.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {file.metadata.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {file.structure && (
                      <div className="text-xs text-gray-500 mt-1">
                        {file.structure.chains.length} chains • {file.structure.atomCount} atoms
                        {file.structure.resolution && ` • ${file.structure.resolution}Å`}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {file.thumbnailUrl && (
                    <Button variant="ghost" size="sm" onClick={() => window.open(file.thumbnailUrl, '_blank')}>
                      <Eye size={16} />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleDownloadFile(file)}>
                    <Download size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteFile(file.id)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}