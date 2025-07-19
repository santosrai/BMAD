// TypeScript definitions for Molstar integration

declare module 'molstar/lib/mol-plugin-ui' {
  export interface PluginUIOptions {
    target: HTMLElement;
    render: (component: any, container: Element) => any;
    spec?: any;
    onBeforeUIRender?: (ctx: any) => (Promise<void> | void);
  }

  export interface PluginUIContext {
    dispose: () => void;
    managers: {
      structure: {
        hierarchy: {
          clear: () => Promise<void>;
          loadStructureFromUrl: (url: string) => Promise<void>;
        };
      };
    };
  }

  export function createPluginUI(options: PluginUIOptions): Promise<PluginUIContext>;
}

declare module 'molstar/lib/mol-plugin-ui/react18' {
  export function renderReact18(component: any, container: Element): any;
}

// Global types for Molstar integration
export interface MolstarViewerState {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  structureUrl?: string;
  loadingProgress: number;
  structureSize: 'small' | 'medium' | 'large' | 'unknown';
}

export interface MolstarViewerProps {
  structureUrl?: string;
  onLoad?: () => void;
  onError?: (error: string) => void;
  className?: string;
  style?: React.CSSProperties;
  performanceMode?: 'auto' | 'high' | 'medium' | 'low';
}

export interface MolstarPerformanceConfig {
  maxAtoms: number;
  levelOfDetail: boolean;
  multiSample: boolean;
  transparency: string;
  postProcessing: boolean;
}

export interface MolstarViewerPreferences {
  performanceMode: 'auto' | 'high' | 'medium' | 'low';
  autoRotate: boolean;
  showAxes: boolean;
  backgroundColor: string;
  representationStyle: 'cartoon' | 'surface' | 'ball-and-stick' | 'spacefill';
} 