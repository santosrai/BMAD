import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { ExportQueue } from './ExportProgress';
import { ExportButton } from './ExportButton';
import { useExport, useExportQueue } from '../../hooks/useExport';

interface ExportManagerProps {
  pdbData?: string;
  canvasElement?: HTMLCanvasElement;
  conversationData?: any[];
  className?: string;
}

export function ExportManager({ 
  pdbData, 
  canvasElement, 
  conversationData, 
  className 
}: ExportManagerProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'queue'>('export');
  const [notifications, setNotifications] = useState<Array<{ id: string; type: 'success' | 'error'; message: string }>>([]);

  const { downloadFile, cleanupJob } = useExport();
  const { queuedJobs, completedJobs, failedJobs, processingJobs, totalJobs } = useExportQueue();

  const addNotification = (type: 'success' | 'error', message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const handleExportStart = () => {
    addNotification('success', 'Export started');
  };

  const handleExportComplete = (result: any) => {
    addNotification('success', `Export completed: ${result.filename}`);
    if (result.downloadUrl) {
      downloadFile(result.downloadUrl, result.filename);
    }
  };

  const handleExportError = (error: string) => {
    addNotification('error', `Export failed: ${error}`);
  };

  const handleDownload = (url: string, filename: string) => {
    downloadFile(url, filename);
  };

  const handleCancel = async (jobId: string) => {
    // Cancel job logic would go here
    addNotification('success', 'Export cancelled');
  };

  const handleClearQueue = () => {
    // Clear completed jobs
    completedJobs.forEach(job => cleanupJob(job.id));
    failedJobs.forEach(job => cleanupJob(job.id));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 space-y-2 z-50">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`p-3 rounded shadow-lg ${
                notification.type === 'success' 
                  ? 'bg-green-100 border border-green-200 text-green-800' 
                  : 'bg-red-100 border border-red-200 text-red-800'
              }`}
            >
              {notification.message}
            </div>
          ))}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b">
        <Button
          variant={activeTab === 'export' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('export')}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
        >
          Export
        </Button>
        <Button
          variant={activeTab === 'queue' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('queue')}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
        >
          Queue {totalJobs > 0 && `(${totalJobs})`}
        </Button>
      </div>

      {/* Export Tab */}
      {activeTab === 'export' && (
        <Card className="p-4">
          <h3 className="font-medium mb-4">Export Options</h3>
          <div className="space-y-4">
            {/* PDB Export */}
            {pdbData && (
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <h4 className="font-medium">PDB Structure</h4>
                  <p className="text-sm text-gray-600">Export molecular structure data</p>
                </div>
                <ExportButton
                  type="pdb"
                  data={pdbData}
                  onExportStart={handleExportStart}
                  onExportComplete={handleExportComplete}
                  onExportError={handleExportError}
                />
              </div>
            )}

            {/* Image Export */}
            {canvasElement && (
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <h4 className="font-medium">Molecular Viewer Image</h4>
                  <p className="text-sm text-gray-600">Export current viewer state as image</p>
                </div>
                <ExportButton
                  type="image"
                  data={canvasElement}
                  onExportStart={handleExportStart}
                  onExportComplete={handleExportComplete}
                  onExportError={handleExportError}
                />
              </div>
            )}

            {/* Conversation Export */}
            {conversationData && conversationData.length > 0 && (
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <h4 className="font-medium">Chat Conversation</h4>
                  <p className="text-sm text-gray-600">Export chat history and AI responses</p>
                </div>
                <ExportButton
                  type="conversation"
                  data={conversationData}
                  onExportStart={handleExportStart}
                  onExportComplete={handleExportComplete}
                  onExportError={handleExportError}
                />
              </div>
            )}

            {/* Batch Export */}
            {(pdbData || canvasElement || (conversationData && conversationData.length > 0)) && (
              <div className="flex items-center justify-between p-3 border rounded bg-gray-50">
                <div>
                  <h4 className="font-medium">Batch Export</h4>
                  <p className="text-sm text-gray-600">Export all available data as archive</p>
                </div>
                <Button
                  onClick={() => {
                    // Implement batch export
                    addNotification('success', 'Batch export started');
                  }}
                >
                  Export All
                </Button>
              </div>
            )}

            {/* No Data Message */}
            {!pdbData && !canvasElement && (!conversationData || conversationData.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <p>No data available for export</p>
                <p className="text-sm">Load a molecular structure or start a conversation to enable exports</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Queue Tab */}
      {activeTab === 'queue' && (
        <ExportQueue
          jobs={[...queuedJobs, ...processingJobs, ...completedJobs, ...failedJobs]}
          onDownload={handleDownload}
          onCancel={handleCancel}
          onClear={handleClearQueue}
        />
      )}
    </div>
  );
}