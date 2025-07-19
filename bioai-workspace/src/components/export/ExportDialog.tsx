import React, { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useExport, useExportTemplates } from '../../hooks/useExport';
import {  EXPORT_FORMATS } from '../../types/export';
import type { ExportSettings } from '../../types/export';

interface ExportDialogProps {
  type: 'pdb' | 'image' | 'conversation';
  data?: any;
  onClose: () => void;
  onExport: (settings: ExportSettings) => Promise<void>;
}

export function ExportDialog({ type, data, onClose, onExport }: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState(EXPORT_FORMATS.JSON);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high' | 'ultra'>('medium');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [customFilename, setCustomFilename] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const { templates, getTemplatesByType } = useExportTemplates();
  const typeTemplates = getTemplatesByType(type);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    
    try {
      const settings: ExportSettings = {
        format: selectedFormat,
        quality,
        includeMetadata,
        includeTimestamps,
        customFilename: customFilename || undefined
      };

      await onExport(settings);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [selectedFormat, quality, includeMetadata, includeTimestamps, customFilename, onExport, onClose]);

  const getAvailableFormats = () => {
    switch (type) {
      case 'pdb':
        return [EXPORT_FORMATS.PDB];
      case 'image':
        return [EXPORT_FORMATS.PNG, EXPORT_FORMATS.SVG];
      case 'conversation':
        return [EXPORT_FORMATS.JSON, EXPORT_FORMATS.CSV, EXPORT_FORMATS.PDF];
      default:
        return [EXPORT_FORMATS.JSON];
    }
  };

  const applyTemplate = (template: any) => {
    setSelectedFormat(template.defaultSettings.format);
    setQuality(template.defaultSettings.quality || 'medium');
    setIncludeMetadata(template.defaultSettings.includeMetadata ?? true);
    setIncludeTimestamps(template.defaultSettings.includeTimestamps ?? true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6 bg-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Export {type.toUpperCase()}</h2>
          <Button variant="ghost" onClick={onClose}>×</Button>
        </div>

        <div className="space-y-4">
          {typeTemplates.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Quick Templates</label>
              <div className="grid grid-cols-1 gap-2">
                {typeTemplates.map(template => (
                  <Button
                    key={template.id}
                    variant="outline"
                    size="sm"
                    onClick={() => applyTemplate(template)}
                    className="text-left justify-start"
                  >
                    {template.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Format</label>
            <select
              value={selectedFormat.name}
              onChange={(e) => {
                const format = getAvailableFormats().find(f => f.name === e.target.value);
                if (format) setSelectedFormat(format);
              }}
              className="w-full p-2 border rounded"
            >
              {getAvailableFormats().map(format => (
                <option key={format.name} value={format.name}>
                  {format.name} - {format.description}
                </option>
              ))}
            </select>
          </div>

          {type === 'image' && (
            <div>
              <label className="block text-sm font-medium mb-2">Quality</label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value as any)}
                className="w-full p-2 border rounded"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="ultra">Ultra</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Filename (optional)</label>
            <input
              type="text"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              placeholder={`export_${Date.now()}.${selectedFormat.extension}`}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                className="mr-2"
              />
              Include metadata
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeTimestamps}
                onChange={(e) => setIncludeTimestamps(e.target.checked)}
                className="mr-2"
              />
              Include timestamps
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}