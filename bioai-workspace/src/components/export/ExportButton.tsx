import React, { useState } from 'react';
import { Button } from '../ui/button';
import { ExportDialog } from './ExportDialog';
import { useExport } from '../../hooks/useExport';
import type { ExportSettings } from '../../types/export';

interface ExportButtonProps {
  type: 'pdb' | 'image' | 'conversation';
  data?: any;
  label?: string;
  disabled?: boolean;
  className?: string;
  onExportStart?: () => void;
  onExportComplete?: (result: any) => void;
  onExportError?: (error: string) => void;
}

export function ExportButton({ 
  type, 
  data, 
  label, 
  disabled, 
  className,
  onExportStart,
  onExportComplete,
  onExportError
}: ExportButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const { exportPDB, exportImage, exportConversation, isLoading } = useExport();

  const handleExport = async (settings: ExportSettings) => {
    try {
      onExportStart?.();
      let result;

      switch (type) {
        case 'pdb':
          if (!data) throw new Error('PDB data is required');
          result = await exportPDB(data, settings);
          break;
        case 'image':
          if (!data) throw new Error('Canvas element is required');
          result = await exportImage(data, settings);
          break;
        case 'conversation':
          if (!data) throw new Error('Conversation data is required');
          result = await exportConversation(data, settings);
          break;
        default:
          throw new Error(`Unsupported export type: ${type}`);
      }

      onExportComplete?.(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      onExportError?.(errorMessage);
    }
  };

  const getDefaultLabel = () => {
    switch (type) {
      case 'pdb': return 'Export PDB';
      case 'image': return 'Export Image';
      case 'conversation': return 'Export Conversation';
      default: return 'Export';
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        disabled={disabled || isLoading}
        className={className}
      >
        {label || getDefaultLabel()}
      </Button>

      {showDialog && (
        <ExportDialog
          type={type}
          data={data}
          onClose={() => setShowDialog(false)}
          onExport={handleExport}
        />
      )}
    </>
  );
}