import { useEffect, useRef, useState, useCallback } from 'react';
import type { MolstarViewerProps, MolstarViewerState } from '../../types/molstar';
import { MolstarModuleLoader } from './MolstarModuleLoader';

export default function SaferMolstarViewer({ 
  structureUrl, 
  onLoad, 
  onError, 
  className = '', 
  style = {},
  performanceMode = 'auto'
}: MolstarViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<any>(null);
  const [state, setState] = useState<MolstarViewerState>({
    isLoaded: false,
    isLoading: false,
    error: null,
    loadingProgress: 0,
    structureSize: 'unknown',
  });

  const updateProgress = useCallback((progress: number) => {
    setState(prev => ({ ...prev, loadingProgress: Math.min(100, Math.max(0, progress)) }));
  }, []);

  const handleError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
    onError?.(error);
  }, [onError]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    const initSaferMolstar = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null, loadingProgress: 0 }));
        
        // Clear container
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }

        // Clean up previous plugin
        if (pluginRef.current) {
          try {
            pluginRef.current.dispose();
          } catch (e) {
            console.warn('Error disposing previous plugin:', e);
          }
          pluginRef.current = null;
        }

        updateProgress(5);

        // Check WebGL support
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
          throw new Error('WebGL is not supported. Please use a modern browser with WebGL enabled.');
        }

        updateProgress(10);

        // Use the safer module loader
        const moduleLoader = MolstarModuleLoader.getInstance();
        
        try {
          await moduleLoader.preloadEssentialModules();
          updateProgress(70);
        } catch (moduleError) {
          throw new Error(`Failed to load Molstar modules: ${moduleError instanceof Error ? moduleError.message : 'Unknown module error'}`);
        }

        updateProgress(80);

        // Create plugin spec with minimal configuration to avoid Provider errors
        let spec;
        try {
          spec = moduleLoader.getDefaultSpec();
          
          // Configure spec to avoid problematic components
          if (spec.behaviors) {
            // Filter out behaviors that might cause Provider errors
            spec.behaviors = spec.behaviors.filter((b: any) => 
              b && b.name && 
              !b.name.includes('mmcif') && 
              !b.name.includes('format-provider') &&
              !b.name.includes('structure-format-provider')
            );
          }

          // Disable problematic UI components
          if (spec.layout) {
            spec.layout.controls = {
              ...spec.layout.controls,
              bottom: 'none',
              log: { isExpanded: false }
            };
          }

          // Disable automatic format detection to avoid Provider errors
          if (spec.config) {
            spec.config = {
              ...spec.config,
              'mol-plugin-ui.auto-hide-controls': true,
              'mol-plugin-ui.disable-format-detection': true
            };
          }

        } catch (specError) {
          throw new Error(`Failed to create plugin spec: ${specError instanceof Error ? specError.message : 'Unknown spec error'}`);
        }

        updateProgress(90);

        // Create plugin with safer parameters
        try {
          const renderFunction = moduleLoader.getRenderFunction();
          
          const plugin = await moduleLoader.createPluginUI({
            target: container,
            render: renderFunction,
            spec: spec,
          });

          if (!plugin) {
            throw new Error('Plugin initialization returned null');
          }

          pluginRef.current = plugin;

          if (!disposed) {
            updateProgress(100);
            setState(prev => ({ ...prev, isLoaded: true, isLoading: false }));
            onLoad?.();
          }

        } catch (pluginError) {
          throw new Error(`Failed to create plugin: ${pluginError instanceof Error ? pluginError.message : 'Unknown plugin error'}`);
        }

      } catch (error) {
        if (!disposed) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to initialize Molstar viewer';
          console.error('Safer Molstar initialization error:', error);
          handleError(errorMessage);
        }
      }
    };

    initSaferMolstar();

    return () => {
      disposed = true;
      if (pluginRef.current) {
        try {
          pluginRef.current.dispose();
        } catch (e) {
          console.warn('Error disposing plugin:', e);
        }
        pluginRef.current = null;
      }
    };
  }, [updateProgress, handleError, onLoad]);

  // Handle structure loading
  useEffect(() => {
    if (!pluginRef.current || !structureUrl || !state.isLoaded) return;

    const loadStructure = async () => {
      try {
        // Basic structure loading without format-specific providers
        const plugin = pluginRef.current;
        
        // Clear existing structures
        await plugin.clear();
        
        // Load structure with minimal format detection
        await plugin.dataFormats.get('pdb').parse(plugin, structureUrl);
        
      } catch (loadError) {
        console.warn('Structure loading failed:', loadError);
        // Don't throw - the viewer can still work without this specific structure
      }
    };

    loadStructure();
  }, [structureUrl, state.isLoaded]);

  if (state.error) {
    return (
      <div style={{ 
        padding: '1rem', 
        textAlign: 'center',
        border: '1px solid #fecaca',
        borderRadius: '6px',
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        ...style
      }}>
        <p style={{ margin: '0 0 1rem 0' }}>Viewer Error: {state.error}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          Reload Page
        </button>
      </div>
    );
  }

  if (state.isLoading) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        ...style
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
        </div>
        <p style={{ margin: '0 0 1rem 0' }}>Loading Molstar Viewer...</p>
        <div style={{ 
          width: '100%', 
          height: '4px', 
          backgroundColor: '#e5e7eb', 
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            width: `${state.loadingProgress}%`, 
            height: '100%', 
            backgroundColor: '#3b82f6',
            transition: 'width 0.3s ease'
          }}></div>
        </div>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
          {state.loadingProgress}% complete
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
        minHeight: '400px',
        ...style 
      }}
    />
  );
}