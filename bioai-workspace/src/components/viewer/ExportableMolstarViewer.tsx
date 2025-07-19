import React, { useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import MolstarViewer from './MolstarViewer';
import { ExportButton } from '../export/ExportButton';
import { useExport } from '../../hooks/useExport';
import { EXPORT_FORMATS } from '../../types/export';
import type { MolstarViewerProps } from '../../types/molstar';

interface ExportableMolstarViewerProps extends MolstarViewerProps {
  pdbData?: string;
  showExportControls?: boolean;
  exportControlsPosition?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
}

export interface ExportableMolstarViewerRef {
  exportPDB: () => Promise<void>;
  exportImage: () => Promise<void>;
  getCanvasElement: () => HTMLCanvasElement | null;
  getPDBData: () => string | null;
}

const ExportableMolstarViewer = forwardRef<ExportableMolstarViewerRef, ExportableMolstarViewerProps>(
  ({ 
    pdbData, 
    showExportControls = true, 
    exportControlsPosition = 'top-right',
    ...molstarProps 
  }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [currentPDBData, setCurrentPDBData] = useState<string | null>(pdbData || null);
    const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    
    const { exportPDB, exportImage } = useExport();

    const findCanvasElement = useCallback(() => {
      const container = containerRef.current;
      if (!container) return null;
      
      const canvas = container.querySelector('canvas');
      if (canvas) {
        setCanvasElement(canvas);
        return canvas;
      }
      return null;
    }, []);

    const handleMolstarLoad = useCallback(() => {
      setTimeout(() => {
        findCanvasElement();
      }, 1000);
      molstarProps.onLoad?.();
    }, [findCanvasElement, molstarProps.onLoad]);

    const handleExportPDB = useCallback(async () => {
      if (!currentPDBData) {
        console.warn('No PDB data available for export');
        return;
      }

      setIsExporting(true);
      try {
        const result = await exportPDB(currentPDBData, {
          format: EXPORT_FORMATS.PDB,
          includeMetadata: true,
          includeSelections: true,
          includeModifications: true,
          includeWaterMolecules: false,
          includeHydrogens: false
        });
        
        if (result.success && result.downloadUrl) {
          const link = document.createElement('a');
          link.href = result.downloadUrl;
          link.download = result.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (error) {
        console.error('PDB export failed:', error);
      } finally {
        setIsExporting(false);
      }
    }, [currentPDBData, exportPDB]);

    const handleExportImage = useCallback(async () => {
      const canvas = canvasElement || findCanvasElement();
      if (!canvas) {
        console.warn('No canvas element found for image export');
        return;
      }

      setIsExporting(true);
      try {
        const result = await exportImage(canvas, {
          format: EXPORT_FORMATS.PNG,
          quality: 'high',
          width: canvas.width,
          height: canvas.height,
          backgroundColor: '#ffffff',
          transparent: false,
          includeAnnotations: true,
          includeLabels: true
        });
        
        if (result.success && result.downloadUrl) {
          const link = document.createElement('a');
          link.href = result.downloadUrl;
          link.download = result.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (error) {
        console.error('Image export failed:', error);
      } finally {
        setIsExporting(false);
      }
    }, [canvasElement, findCanvasElement, exportImage]);

    const getPDBData = useCallback(() => {
      return currentPDBData;
    }, [currentPDBData]);

    const getCanvasElement = useCallback(() => {
      return canvasElement || findCanvasElement();
    }, [canvasElement, findCanvasElement]);

    useImperativeHandle(ref, () => ({
      exportPDB: handleExportPDB,
      exportImage: handleExportImage,
      getCanvasElement,
      getPDBData
    }), [handleExportPDB, handleExportImage, getCanvasElement, getPDBData]);

    const getExportControlsStyle = () => {
      const baseStyle = {
        position: 'absolute' as const,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '8px',
        padding: '8px',
      };

      switch (exportControlsPosition) {
        case 'top-right':
          return { ...baseStyle, top: '10px', right: '10px' };
        case 'bottom-right':
          return { ...baseStyle, bottom: '10px', right: '10px' };
        case 'top-left':
          return { ...baseStyle, top: '10px', left: '10px' };
        case 'bottom-left':
          return { ...baseStyle, bottom: '10px', left: '10px' };
        default:
          return { ...baseStyle, top: '10px', right: '10px' };
      }
    };

    return (
      <div ref={containerRef} className="exportable-molstar-viewer" style={{ position: 'relative', width: '100%', height: '100%' }}>
        <MolstarViewer
          {...molstarProps}
          onLoad={handleMolstarLoad}
        />
        
        {showExportControls && (
          <div style={getExportControlsStyle()}>
            <ExportButton
              type="pdb"
              data={currentPDBData}
              label="Export PDB"
              disabled={!currentPDBData || isExporting}
              className="export-btn-small"
              onExportStart={() => setIsExporting(true)}
              onExportComplete={() => setIsExporting(false)}
              onExportError={() => setIsExporting(false)}
            />
            
            <ExportButton
              type="image"
              data={canvasElement}
              label="Export Image"
              disabled={!canvasElement || isExporting}
              className="export-btn-small"
              onExportStart={() => setIsExporting(true)}
              onExportComplete={() => setIsExporting(false)}
              onExportError={() => setIsExporting(false)}
            />
          </div>
        )}
        
        {isExporting && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}>
              <div className="loading-spinner">
                <div className="spinner-ring"></div>
              </div>
              <p>Exporting...</p>
            </div>
          </div>
        )}
      </div>
    );
  }
);

ExportableMolstarViewer.displayName = 'ExportableMolstarViewer';

export default ExportableMolstarViewer;