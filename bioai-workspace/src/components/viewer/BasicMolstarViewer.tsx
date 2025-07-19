import { useEffect, useRef, useState } from 'react';
import type { MolstarViewerProps } from '../../types/molstar';

export default function BasicMolstarViewer({ 
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

    const initBasicViewer = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setProgress(20);

        // Clear container
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }

        // Check for WebGL support
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
          throw new Error('WebGL is not supported in this browser');
        }

        setProgress(40);

        // Import only the essential modules with error handling
        const pluginUIModule = await import('molstar/lib/mol-plugin-ui');
        if (!pluginUIModule || !pluginUIModule.createPluginUI) {
          throw new Error('createPluginUI not available');
        }
        const { createPluginUI } = pluginUIModule;
        setProgress(60);

        const reactModule = await import('molstar/lib/mol-plugin-ui/react18');
        if (!reactModule || !reactModule.renderReact18) {
          throw new Error('renderReact18 not available');
        }
        const { renderReact18 } = reactModule;
        setProgress(70);

        const specModule = await import('molstar/lib/mol-plugin-ui/spec');
        if (!specModule || !specModule.DefaultPluginUISpec) {
          throw new Error('DefaultPluginUISpec not available');
        }
        const { DefaultPluginUISpec } = specModule;
        setProgress(80);

        // Create basic spec with minimal configuration
        const spec = DefaultPluginUISpec();
        setProgress(90);
        
        // Configure to be as simple as possible and avoid problematic components
        if (spec.layout) {
          spec.layout.controls = {
            ...spec.layout.controls,
            bottom: 'none',
            log: { isExpanded: false }
          };
        }

        // Disable potentially problematic behaviors
        if (spec.behaviors) {
          spec.behaviors = spec.behaviors.filter((b: any) => 
            b && !b.name?.includes('format') && !b.name?.includes('provider')
          );
        }

        // Create plugin with error handling
        const plugin = await createPluginUI({
          target: container,
          render: renderReact18,
          spec: spec,
        });

        if (!plugin) {
          throw new Error('Plugin creation failed');
        }

        if (!disposed) {
          setProgress(100);
          setIsLoading(false);
          onLoad?.();
        }

      } catch (err) {
        if (!disposed) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to initialize basic viewer';
          console.error('Basic viewer error:', err);
          setError(errorMessage);
          setIsLoading(false);
          onError?.(errorMessage);
        }
      }
    };

    initBasicViewer();

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
          Viewer Error
        </h3>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          {error}
        </p>
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
        <h3 style={{ color: '#374151', marginBottom: '1rem' }}>
          Loading 3D Viewer...
        </h3>
        <div style={{ 
          width: '200px', 
          height: '6px', 
          backgroundColor: '#e5e7eb', 
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            width: `${progress}%`, 
            height: '100%', 
            backgroundColor: '#3b82f6',
            transition: 'width 0.3s ease'
          }}></div>
        </div>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          {progress}% complete
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