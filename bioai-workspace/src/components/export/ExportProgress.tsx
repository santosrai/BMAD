import React from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useExportProgress } from '../../hooks/useExport';

interface ExportProgressProps {
  jobId: string;
  onDownload?: (url: string, filename: string) => void;
  onCancel?: (jobId: string) => void;
  onClose?: () => void;
}

export function ExportProgress({ jobId, onDownload, onCancel, onClose }: ExportProgressProps) {
  const { job, progress, status, isCompleted, isFailed, isProcessing, isPending } = useExportProgress(jobId);

  if (!job) {
    return (
      <Card className="p-4">
        <p className="text-gray-500">Loading export job...</p>
      </Card>
    );
  }

  const getStatusColor = () => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'processing': return 'text-blue-600';
      case 'pending': return 'text-yellow-600';
      case 'cancelled': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      case 'processing': return 'Processing...';
      case 'pending': return 'Pending';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  };

  return (
    <Card className="p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-medium">{job.filename}</h3>
          <p className={`text-sm ${getStatusColor()}`}>{getStatusText()}</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isCompleted ? 'bg-green-500' : isFailed ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between text-sm text-gray-600">
          <span>{progress}% complete</span>
          <span>{job.type.toUpperCase()}</span>
        </div>

        {job.error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded">
            <p className="text-red-600 text-sm">{job.error}</p>
          </div>
        )}

        {job.fileSize && (
          <p className="text-sm text-gray-600">
            Size: {(job.fileSize / 1024).toFixed(1)} KB
          </p>
        )}

        <div className="flex justify-end space-x-2">
          {isPending && onCancel && (
            <Button variant="outline" size="sm" onClick={() => onCancel(jobId)}>
              Cancel
            </Button>
          )}
          
          {isCompleted && job.downloadUrl && onDownload && (
            <Button size="sm" onClick={() => onDownload(job.downloadUrl!, job.filename)}>
              Download
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

interface ExportQueueProps {
  jobs: any[];
  onDownload?: (url: string, filename: string) => void;
  onCancel?: (jobId: string) => void;
  onClear?: () => void;
}

export function ExportQueue({ jobs, onDownload, onCancel, onClear }: ExportQueueProps) {
  const activeJobs = jobs.filter(job => job.status !== 'completed' && job.status !== 'failed');
  const completedJobs = jobs.filter(job => job.status === 'completed');
  const failedJobs = jobs.filter(job => job.status === 'failed');

  if (jobs.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-gray-500 text-center">No export jobs</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">Export Queue</h3>
        {onClear && jobs.length > 0 && (
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear All
          </Button>
        )}
      </div>

      {activeJobs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Active Jobs</h4>
          {activeJobs.map(job => (
            <ExportProgress
              key={job.id}
              jobId={job.id}
              onDownload={onDownload}
              onCancel={onCancel}
            />
          ))}
        </div>
      )}

      {completedJobs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-green-700">Completed Jobs</h4>
          {completedJobs.map(job => (
            <ExportProgress
              key={job.id}
              jobId={job.id}
              onDownload={onDownload}
            />
          ))}
        </div>
      )}

      {failedJobs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-red-700">Failed Jobs</h4>
          {failedJobs.map(job => (
            <ExportProgress
              key={job.id}
              jobId={job.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}