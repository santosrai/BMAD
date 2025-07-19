import type { SessionState } from '../services/sessionManager';

// Interface for serializable viewer state
export interface SerializableViewerState {
  structures: Array<{
    id: string;
    url: string;
    name: string;
    loadedAt: number;
    type?: string;
    format?: string;
    metadata?: Record<string, any>;
  }>;
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    up: [number, number, number];
    fov: number;
    near: number;
    far: number;
  };
  representations: Array<{
    id: string;
    type: string;
    params: Record<string, any>;
    structureId: string;
    visible: boolean;
    opacity: number;
    color?: string;
  }>;
  selections: Array<{
    id: string;
    label: string;
    expression: string;
    structureId: string;
    type: 'residue' | 'atom' | 'chain' | 'custom';
    highlight: boolean;
    color?: string;
  }>;
  measurements: Array<{
    id: string;
    type: 'distance' | 'angle' | 'dihedral' | 'rmsd';
    atoms: Array<{
      structureId: string;
      atomId: string;
      position: [number, number, number];
    }>;
    value: number;
    unit: string;
    label: string;
    visible: boolean;
  }>;
  annotations: Array<{
    id: string;
    type: 'text' | 'arrow' | 'highlight' | 'note';
    position: [number, number, number];
    content: string;
    style: Record<string, any>;
    visible: boolean;
  }>;
  viewingMode: 'cartoon' | 'surface' | 'ball-and-stick' | 'spacefill' | 'ribbon' | 'custom';
  visualization: {
    lighting: {
      ambient: number;
      directional: number;
      shadows: boolean;
      shadowIntensity: number;
    };
    quality: 'low' | 'medium' | 'high' | 'ultra';
    transparency: number;
    colorScheme: string;
    backgroundColor: string;
    fog: {
      enabled: boolean;
      near: number;
      far: number;
      color: string;
    };
  };
  viewport: {
    width: number;
    height: number;
    pixelRatio: number;
  };
  performance: {
    levelOfDetail: boolean;
    maxAtoms: number;
    simplificationLevel: number;
  };
}

// Interface for serializable interaction data
export interface SerializableInteraction {
  id: string;
  type: 'click' | 'hover' | 'select' | 'zoom' | 'rotate' | 'pan' | 'load' | 'analyze';
  timestamp: number;
  data: {
    structureId?: string;
    atomId?: string;
    residueId?: string;
    chainId?: string;
    position?: [number, number, number];
    viewMatrix?: number[];
    zoomLevel?: number;
    selection?: string;
    duration?: number;
    metadata?: Record<string, any>;
  };
  context: {
    sessionId: string;
    userId: string;
    activeStructures: string[];
    currentView: string;
  };
}

export class SessionSerializer {
  private static instance: SessionSerializer;
  private compressionEnabled: boolean = true;
  private maxStateSize: number = 1024 * 1024; // 1MB
  private maxInteractionHistory: number = 100;

  private constructor() {}

  static getInstance(): SessionSerializer {
    if (!SessionSerializer.instance) {
      SessionSerializer.instance = new SessionSerializer();
    }
    return SessionSerializer.instance;
  }

  // Serialize viewer state from Mol* viewer instance
  serializeViewerState(viewer: any): SerializableViewerState {
    try {
      const state: SerializableViewerState = {
        structures: this.serializeStructures(viewer),
        camera: this.serializeCamera(viewer),
        representations: this.serializeRepresentations(viewer),
        selections: this.serializeSelections(viewer),
        measurements: this.serializeMeasurements(viewer),
        annotations: this.serializeAnnotations(viewer),
        viewingMode: this.getViewingMode(viewer),
        visualization: this.serializeVisualization(viewer),
        viewport: this.serializeViewport(viewer),
        performance: this.serializePerformance(viewer),
      };

      // Validate state size
      const stateSize = JSON.stringify(state).length;
      if (stateSize > this.maxStateSize) {
        console.warn(`Viewer state size (${stateSize}) exceeds maximum (${this.maxStateSize})`);
        return this.compressViewerState(state);
      }

      return state;
    } catch (error) {
      console.error('Error serializing viewer state:', error);
      return this.getDefaultViewerState();
    }
  }

  // Deserialize viewer state and apply to Mol* viewer
  async deserializeViewerState(viewer: any, state: SerializableViewerState): Promise<void> {
    try {
      // Clear existing state
      await this.clearViewerState(viewer);

      // Load structures
      await this.loadStructures(viewer, state.structures);

      // Apply camera state
      await this.applyCamera(viewer, state.camera);

      // Apply representations
      await this.applyRepresentations(viewer, state.representations);

      // Apply selections
      await this.applySelections(viewer, state.selections);

      // Apply measurements
      await this.applyMeasurements(viewer, state.measurements);

      // Apply annotations
      await this.applyAnnotations(viewer, state.annotations);

      // Apply visualization settings
      await this.applyVisualization(viewer, state.visualization);

      // Apply viewport settings
      await this.applyViewport(viewer, state.viewport);

      // Apply performance settings
      await this.applyPerformance(viewer, state.performance);

      console.log('Viewer state restored successfully');
    } catch (error) {
      console.error('Error deserializing viewer state:', error);
      throw new Error('Failed to restore viewer state');
    }
  }

  // Serialize interaction data
  serializeInteraction(interaction: any): SerializableInteraction {
    return {
      id: interaction.id || `interaction_${Date.now()}`,
      type: interaction.type,
      timestamp: interaction.timestamp || Date.now(),
      data: {
        structureId: interaction.structureId,
        atomId: interaction.atomId,
        residueId: interaction.residueId,
        chainId: interaction.chainId,
        position: interaction.position,
        viewMatrix: interaction.viewMatrix,
        zoomLevel: interaction.zoomLevel,
        selection: interaction.selection,
        duration: interaction.duration,
        metadata: interaction.metadata,
      },
      context: {
        sessionId: interaction.sessionId,
        userId: interaction.userId,
        activeStructures: interaction.activeStructures || [],
        currentView: interaction.currentView || 'default',
      },
    };
  }

  // Serialize full session state
  serializeSessionState(chatMessages: any[], viewerState: SerializableViewerState, aiWorkflowState: any, interactions: SerializableInteraction[]): SessionState {
    const state: SessionState = {
      chatState: {
        messages: chatMessages,
        messageCount: chatMessages.length,
        sessionTitle: `Session ${new Date().toLocaleString()}`,
      },
      viewerState,
      aiWorkflowState,
      userInteractions: interactions.slice(-this.maxInteractionHistory),
      metadata: {
        lastSaved: Date.now(),
        autoSaveEnabled: true,
        size: 0,
      },
    };

    // Calculate state size
    state.metadata!.size = JSON.stringify(state).length;

    return state;
  }

  // Deserialize session state
  async deserializeSessionState(state: SessionState, viewer: any): Promise<void> {
    try {
      // Restore viewer state if available
      if (state.viewerState) {
        await this.deserializeViewerState(viewer, state.viewerState);
      }

      // Restore chat state is handled separately by the chat system
      // AI workflow state is handled by the workflow manager
      // Interactions are for analytics and replay purposes

      console.log('Session state restored successfully');
    } catch (error) {
      console.error('Error deserializing session state:', error);
      throw new Error('Failed to restore session state');
    }
  }

  // Validate viewer state integrity
  validateViewerState(state: SerializableViewerState): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!state.structures || !Array.isArray(state.structures)) {
      errors.push('Invalid structures array');
    }

    if (!state.camera || typeof state.camera !== 'object') {
      errors.push('Invalid camera object');
    }

    if (!state.representations || !Array.isArray(state.representations)) {
      errors.push('Invalid representations array');
    }

    if (!state.selections || !Array.isArray(state.selections)) {
      errors.push('Invalid selections array');
    }

    // Validate structure references
    const structureIds = new Set(state.structures.map(s => s.id));
    
    state.representations.forEach((rep, index) => {
      if (!structureIds.has(rep.structureId)) {
        errors.push(`Representation ${index} references unknown structure ${rep.structureId}`);
      }
    });

    state.selections.forEach((sel, index) => {
      if (!structureIds.has(sel.structureId)) {
        errors.push(`Selection ${index} references unknown structure ${sel.structureId}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Create a checksum for state verification
  createChecksum(state: any): string {
    const str = JSON.stringify(state);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  // Compress viewer state for storage efficiency
  private compressViewerState(state: SerializableViewerState): SerializableViewerState {
    // Reduce precision of numeric values
    const compressedState = { ...state };
    
    // Reduce camera precision
    compressedState.camera = {
      ...state.camera,
      position: state.camera.position.map(v => Math.round(v * 1000) / 1000) as [number, number, number],
      target: state.camera.target.map(v => Math.round(v * 1000) / 1000) as [number, number, number],
      up: state.camera.up.map(v => Math.round(v * 1000) / 1000) as [number, number, number],
    };

    // Limit interactions
    if (state.measurements.length > 50) {
      compressedState.measurements = state.measurements.slice(-50);
    }

    if (state.annotations.length > 50) {
      compressedState.annotations = state.annotations.slice(-50);
    }

    return compressedState;
  }

  // Get default viewer state
  private getDefaultViewerState(): SerializableViewerState {
    return {
      structures: [],
      camera: {
        position: [0, 0, 100],
        target: [0, 0, 0],
        up: [0, 1, 0],
        fov: 45,
        near: 0.1,
        far: 1000,
      },
      representations: [],
      selections: [],
      measurements: [],
      annotations: [],
      viewingMode: 'cartoon',
      visualization: {
        lighting: {
          ambient: 0.3,
          directional: 0.7,
          shadows: true,
          shadowIntensity: 0.5,
        },
        quality: 'medium',
        transparency: 0.8,
        colorScheme: 'default',
        backgroundColor: '#ffffff',
        fog: {
          enabled: false,
          near: 50,
          far: 200,
          color: '#cccccc',
        },
      },
      viewport: {
        width: 800,
        height: 600,
        pixelRatio: 1,
      },
      performance: {
        levelOfDetail: true,
        maxAtoms: 100000,
        simplificationLevel: 1,
      },
    };
  }

  // Helper methods for specific serialization tasks
  private serializeStructures(viewer: any): SerializableViewerState['structures'] {
    // Implementation depends on Mol* API
    return [];
  }

  private serializeCamera(viewer: any): SerializableViewerState['camera'] {
    // Implementation depends on Mol* API
    return this.getDefaultViewerState().camera;
  }

  private serializeRepresentations(viewer: any): SerializableViewerState['representations'] {
    // Implementation depends on Mol* API
    return [];
  }

  private serializeSelections(viewer: any): SerializableViewerState['selections'] {
    // Implementation depends on Mol* API
    return [];
  }

  private serializeMeasurements(viewer: any): SerializableViewerState['measurements'] {
    // Implementation depends on Mol* API
    return [];
  }

  private serializeAnnotations(viewer: any): SerializableViewerState['annotations'] {
    // Implementation depends on Mol* API
    return [];
  }

  private getViewingMode(viewer: any): SerializableViewerState['viewingMode'] {
    // Implementation depends on Mol* API
    return 'cartoon';
  }

  private serializeVisualization(viewer: any): SerializableViewerState['visualization'] {
    // Implementation depends on Mol* API
    return this.getDefaultViewerState().visualization;
  }

  private serializeViewport(viewer: any): SerializableViewerState['viewport'] {
    // Implementation depends on Mol* API
    return this.getDefaultViewerState().viewport;
  }

  private serializePerformance(viewer: any): SerializableViewerState['performance'] {
    // Implementation depends on Mol* API
    return this.getDefaultViewerState().performance;
  }

  // Helper methods for deserialization
  private async clearViewerState(viewer: any): Promise<void> {
    // Implementation depends on Mol* API
  }

  private async loadStructures(viewer: any, structures: SerializableViewerState['structures']): Promise<void> {
    // Implementation depends on Mol* API
  }

  private async applyCamera(viewer: any, camera: SerializableViewerState['camera']): Promise<void> {
    // Implementation depends on Mol* API
  }

  private async applyRepresentations(viewer: any, representations: SerializableViewerState['representations']): Promise<void> {
    // Implementation depends on Mol* API
  }

  private async applySelections(viewer: any, selections: SerializableViewerState['selections']): Promise<void> {
    // Implementation depends on Mol* API
  }

  private async applyMeasurements(viewer: any, measurements: SerializableViewerState['measurements']): Promise<void> {
    // Implementation depends on Mol* API
  }

  private async applyAnnotations(viewer: any, annotations: SerializableViewerState['annotations']): Promise<void> {
    // Implementation depends on Mol* API
  }

  private async applyVisualization(viewer: any, visualization: SerializableViewerState['visualization']): Promise<void> {
    // Implementation depends on Mol* API
  }

  private async applyViewport(viewer: any, viewport: SerializableViewerState['viewport']): Promise<void> {
    // Implementation depends on Mol* API
  }

  private async applyPerformance(viewer: any, performance: SerializableViewerState['performance']): Promise<void> {
    // Implementation depends on Mol* API
  }
}

export const sessionSerializer = SessionSerializer.getInstance();