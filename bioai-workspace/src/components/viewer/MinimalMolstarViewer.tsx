import { useEffect, useRef, useState } from 'react';
import type { MolstarViewerProps } from '../../types/molstar';

export default function MinimalMolstarViewer({ 
  structureUrl, 
  onLoad, 
  onError, 
  className = '', 
  style = {} 
}: MolstarViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    const initMinimalViewer = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setProgress(10);

        // Check for WebGL support
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
          throw new Error('WebGL is not supported in this browser');
        }

        setProgress(30);

        // Try to load just the essential modules without the problematic ones
        let createPluginUI, renderReact18, DefaultPluginUISpec;

        try {
          // Load modules in a specific order to avoid Provider issues
          const utilModule = await import('molstar/lib/mol-util');
          setProgress(40);

          const pluginModule = await import('molstar/lib/mol-plugin');
          setProgress(50);

          const uiModule = await import('molstar/lib/mol-plugin-ui');
          createPluginUI = uiModule.createPluginUI;
          setProgress(60);

          const reactModule = await import('molstar/lib/mol-plugin-ui/react18');
          renderReact18 = reactModule.renderReact18;
          setProgress(70);

          const specModule = await import('molstar/lib/mol-plugin-ui/spec');
          DefaultPluginUISpec = specModule.DefaultPluginUISpec;
          setProgress(80);

          // Create a minimal spec that avoids problematic components
          const spec = DefaultPluginUISpec();
          
          // Disable potentially problematic features
          if (spec.behaviors) {
            spec.behaviors = spec.behaviors.filter(b => 
              !b.name.includes('mmcif') && 
              !b.name.includes('format-provider')
            );
          }

          // Hide problematic UI components
          if (spec.layout) {
            spec.layout.controls = {
              ...spec.layout.controls,
              bottom: 'none',
              log: { isExpanded: false }
            };
          }

          setProgress(90);

          // Create the plugin
          const plugin = await createPluginUI({
            target: container,
            render: renderReact18,
            spec: spec,
          });

          if (!disposed) {
            setProgress(100);
            setIsLoading(false);
            onLoad?.();
          }

        } catch (moduleError) {
          throw new Error(`Failed to load Molstar modules: ${moduleError instanceof Error ? moduleError.message : 'Unknown error'}`);
        }

      } catch (err) {
        if (!disposed) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to initialize viewer';
          console.error('Minimal viewer error:', err);
          setError(errorMessage);
          setIsLoading(false);
          onError?.(errorMessage);
        }
      }
    };

    initMinimalViewer();

    return () => {
      disposed = true;
    };
  }, [onLoad, onError]);

  if (error) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        backgroundColor: '#fef2f2',
        minHeight: '300px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        ...style
      }}>
        <div style={{ marginBottom: '1rem', color: '#dc2626' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h3 style={{ color: '#dc2626', marginBottom: '1rem' }}>
          3D Viewer Error
        </h3>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {error}
        </p>
        <div style={{ 
          padding: '1rem',
          backgroundColor: '#fef3c7',
          borderRadius: '4px',
          fontSize: '0.8rem',
          color: '#92400e'
        }}>
          <strong>Alternative:</strong> Try uploading a PDB file directly or use the chat interface for molecular analysis.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: '#f9fafb',
        minHeight: '300px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        ...style
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
        <h3 style={{ color: '#374151', marginBottom: '0.5rem' }}>
          Loading 3D Viewer...
        </h3>
        <div style={{ 
          width: '200px', 
          height: '6px', 
          backgroundColor: '#e5e7eb', 
          borderRadius: '3px',
          overflow: 'hidden',
          marginBottom: '0.5rem'
        }}>
          <div style={{ 
            width: `${progress}%`, 
            height: '100%', 
            backgroundColor: '#3b82f6',
            transition: 'width 0.3s ease'
          }}></div>
        </div>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          {progress}% - Loading molecular viewer modules...
        </p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={className}
      style={{ 
        width: '100%', 
        height: '100%', 
        minHeight: '300px',
        position: 'relative',
        ...style 
      }}
    />
  );
}