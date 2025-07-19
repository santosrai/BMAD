import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { MolstarViewerProps, MolstarViewerState } from '../../types/molstar';
import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';

export default function MolstarViewer({ 
  structureUrl, 
  onLoad, 
  onError, 
  className = '', 
  style = {},
  performanceMode = 'auto' // 'auto', 'high', 'medium', 'low'
}: MolstarViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<PluginUIContext | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [state, setState] = useState<MolstarViewerState>({
    isLoaded: false,
    isLoading: false,
    error: null,
    loadingProgress: 0,
    structureSize: 'unknown',
  });

  // Performance configuration based on mode
  const performanceConfig = useMemo(() => {
    const configs = {
      high: {
        maxAtoms: 100000,
        levelOfDetail: false,
        transparency: 'blended',
        postProcessing: true,
      },
      medium: {
        maxAtoms: 50000,
        levelOfDetail: true,
        transparency: 'wboit',
        postProcessing: true,
      },
      low: {
        maxAtoms: 20000,
        levelOfDetail: true,
        transparency: 'dpoit',
        postProcessing: false,
      },
    };

    if (performanceMode === 'auto') {
      // Auto-detect performance mode based on device capabilities
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
      if (!gl) return configs.low;
      
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
      
      // Simple heuristic for performance detection
      if (renderer.includes('GeForce') || renderer.includes('Radeon') || renderer.includes('Intel Iris')) {
        return configs.high;
      } else if (renderer.includes('Intel HD') || renderer.includes('UHD')) {
        return configs.medium;
      } else {
        return configs.low;
      }
    }

    return configs[performanceMode as keyof typeof configs] || configs.medium;
  }, [performanceMode]);

  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Debounced error handler
  const debouncedErrorHandler = useCallback((error: string) => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    loadingTimeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, error, isLoading: false }));
      onErrorRef.current?.(error);
    }, 100);
  }, []);

  // Progressive loading status updates
  const updateLoadingProgress = useCallback((progress: number) => {
    setState(prev => ({ ...prev, loadingProgress: Math.min(100, Math.max(0, progress)) }));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let plugin: PluginUIContext | null = null;

    const initMolstar = async () => {
      // Clean up any previous instance and clear the container
      if (pluginRef.current) {
        try {
          pluginRef.current.dispose();
        } catch (disposeError) {
          console.warn('Error disposing previous plugin:', disposeError);
        }
        pluginRef.current = null;
      }
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      try {
        setState(prev => ({ ...prev, isLoading: true, error: null, loadingProgress: 0, isLoaded: false }));
        updateLoadingProgress(10);

        // Test WebGL support before loading Molstar
        const canvas = document.createElement('canvas');
        // const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        // if (!gl) {
        //   throw new Error('WebGL is not supported. The 3D molecular viewer requires WebGL to function properly.');
        // }

        // Import modules with individual error handling
        let createPluginUI, renderReact18, DefaultPluginUISpec;
        
        try {
          const pluginUIModule = await import('molstar/lib/mol-plugin-ui');
          createPluginUI = pluginUIModule.createPluginUI;
          if (!createPluginUI) {
            throw new Error('Failed to import createPluginUI');
          }
          updateLoadingProgress(30);
        } catch (importError) {
          throw new Error(`Failed to import mol-plugin-ui: ${importError instanceof Error ? importError.message : 'Unknown error'}`);
        }
        
        try {
          const react18Module = await import('molstar/lib/mol-plugin-ui/react18');
          renderReact18 = react18Module.renderReact18;
          if (!renderReact18) {
            throw new Error('Failed to import renderReact18');
          }
          updateLoadingProgress(50);
        } catch (importError) {
          throw new Error(`Failed to import react18 renderer: ${importError instanceof Error ? importError.message : 'Unknown error'}`);
        }
        
        try {
          const specModule = await import('molstar/lib/mol-plugin-ui/spec');
          DefaultPluginUISpec = specModule.DefaultPluginUISpec;
          if (!DefaultPluginUISpec) {
            throw new Error('Failed to import DefaultPluginUISpec');
          }
          updateLoadingProgress(70);
        } catch (importError) {
          throw new Error(`Failed to import plugin spec: ${importError instanceof Error ? importError.message : 'Unknown error'}`);
        }
        
        // Create custom spec with performance optimizations
        let customSpec;
        try {
          customSpec = DefaultPluginUISpec();
          if (!customSpec) {
            throw new Error('Failed to create DefaultPluginUISpec');
          }
        } catch (specError) {
          throw new Error(`Failed to create plugin spec: ${specError instanceof Error ? specError.message : 'Unknown error'}`);
        }
        
        // Apply performance configurations with error handling
        try {
          if (customSpec.canvas3d) {
            customSpec.canvas3d.renderer = {
              ...customSpec.canvas3d.renderer,
              // transparency: {
              //   mode: performanceConfig.transparency,
              // },
              // postProcessing: {
              //   outline: {
              //     name: 'on',
              //     params: { scale: 1, threshold: 0.33 }
              //   },
              //   occlusion: {
              //     name: performanceConfig.postProcessing ? 'on' : 'off',
              //     params: { samples: 32, radius: 5, bias: 0.8, blurKernelSize: 15 }
              //   },
              //   shadow: {
              //     name: 'off'
              //   }
              // }
            };
          }
        } catch (configError) {
          console.warn('Failed to apply performance config:', configError);
        }
        
        // Hide the log panel
        try {
          if (customSpec.layout) {
            customSpec.layout.initial = {
              ...customSpec.layout.initial,
              showControls: true,
              isExpanded: false,
              controlsDisplay: 'reactive',
            };
            // customSpec.layout.controls = {
            //   ...customSpec.layout.controls,
            //   bottom: 'none', // This removes the bottom panel including the log
            //   log: {
            //     isExpanded: false
            //   }
            // };
          }
        } catch (layoutError) {
          console.warn('Failed to configure layout:', layoutError);
        }
        
        updateLoadingProgress(90);
        
        try {
          const plugin = await createPluginUI({
            target: container,
            render: renderReact18,
            spec: customSpec,
          });
          
          if (!plugin) {
            throw new Error('Plugin initialization returned null');
          }
          
          //pluginRef.current = plugin;
        } catch (pluginError) {
          throw new Error(`Failed to create plugin UI: ${pluginError instanceof Error ? pluginError.message : 'Unknown error'}`);
        }
        
        if (!disposed) {
          updateLoadingProgress(100);
          setState(prev => ({ ...prev, isLoaded: true, isLoading: false }));
          onLoadRef.current?.();
        }
      } catch (error) {
        if (!disposed) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to initialize Molstar viewer';
          console.error('Molstar initialization error:', error);
          debouncedErrorHandler(errorMessage);
        }
      }
    };

    initMolstar();
    
    return () => {
      disposed = true;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (plugin) {
       // plugin.dispose();
        pluginRef.current = null;
      }
    };
  }, [performanceConfig, debouncedErrorHandler, updateLoadingProgress]);

  useEffect(() => {
    if (!pluginRef.current || !structureUrl || !state.isLoaded) return;
    (async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null, loadingProgress: 0 }));
        updateLoadingProgress(5);
        
        const { PluginCommands } = await import('molstar/lib/mol-plugin/commands');
        updateLoadingProgress(10);
        
        // Remove previous structure if any
        await pluginRef.current!.clear();
        updateLoadingProgress(20);
        
        // Estimate structure size
        const estimateStructureSize = async (url: string) => {
          try {
            const response = await fetch(url, { method: 'HEAD' });
            const contentLength = response.headers.get('content-length');
            if (contentLength) {
              const size = parseInt(contentLength);
              if (size > 10 * 1024 * 1024) return 'large'; // > 10MB
              if (size > 1 * 1024 * 1024) return 'medium'; // > 1MB
              return 'small';
            }
            return 'unknown';
          } catch {
            return 'unknown';
          }
        };
        
        const structureSize = await estimateStructureSize(structureUrl);
        setState(prev => ({ ...prev, structureSize }));
        updateLoadingProgress(30);
        
        // Load structure using correct API
        const format = structureUrl.endsWith('.pdb') ? 'pdb' : 'mmcif';
        const isBinary = structureUrl.endsWith('.bcif');
        
        const data = await pluginRef.current!.builders.data.download({ url: structureUrl, isBinary });
        updateLoadingProgress(50);
        
        const trajectory = await pluginRef.current!.builders.structure.parseTrajectory(data, format);
        updateLoadingProgress(70);
        
        await pluginRef.current!.builders.structure.hierarchy.applyPreset(trajectory, 'default');
        updateLoadingProgress(100);
        
        setState(prev => ({ ...prev, isLoading: false }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load structure';
        debouncedErrorHandler(errorMessage);
      }
    })();
  }, [structureUrl, state.isLoaded, performanceConfig, debouncedErrorHandler, updateLoadingProgress]);

  return (
    <div 
      className={`molstar-viewer ${className}`}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        position: 'relative',
        ...style,
      }}
    >
      {state.isLoading && (
        <div className="molstar-loading">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
            <div className="loading-text">
              Loading molecular structure...
            </div>
            <div className="loading-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${state.loadingProgress}%` }}
                ></div>
              </div>
              <div className="progress-text">
                {state.loadingProgress}%
                {state.structureSize !== 'unknown' && (
                  <span className="structure-size"> ({state.structureSize} structure)</span>
                )}
              </div>
            </div>
            <div className="performance-indicator">
              Performance mode: {performanceMode === 'auto' ? 'auto-detected' : performanceMode}
            </div>
          </div>
        </div>
      )}
      {state.error && (
        <div className="molstar-error">
          <div className="error-icon">⚠️</div>
          <p>Error: {state.error}</p>
          <div className="error-actions">
            <button onClick={() => window.location.reload()}>
              Retry
            </button>
            <button onClick={() => setState(prev => ({ ...prev, error: null }))}>
              Dismiss
            </button>
          </div>
          <div className="error-details">
            <details>
              <summary>Performance Information</summary>
              <ul>
                <li>Performance mode: {performanceMode}</li>
                <li>Max atoms: {performanceConfig.maxAtoms.toLocaleString()}</li>
                <li>Level of detail: {performanceConfig.levelOfDetail ? 'enabled' : 'disabled'}</li>
                <li>Structure size: {state.structureSize}</li>
              </ul>
            </details>
          </div>
        </div>
      )}
      <div 
        ref={containerRef}
        className="molstar-container"
        style={{
          width: '100%',
          height: '100%',
          display: state.error ? 'none' : 'block',
        }}
      />
    </div>
  );
}