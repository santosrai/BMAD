/**
 * Custom Molstar module loader that addresses the Provider undefined error
 * by ensuring proper module initialization order
 */

export class MolstarModuleLoader {
  private static instance: MolstarModuleLoader;
  private loadedModules: Map<string, any> = new Map();
  private isInitialized = false;

  static getInstance(): MolstarModuleLoader {
    if (!MolstarModuleLoader.instance) {
      MolstarModuleLoader.instance = new MolstarModuleLoader();
    }
    return MolstarModuleLoader.instance;
  }

  async preloadEssentialModules(): Promise<void> {
    if (this.isInitialized) {
      console.log('[MolstarModuleLoader] Already initialized. Skipping preload.');
      return;
    }

    try {
      console.log('[MolstarModuleLoader] Preloading Molstar modules...');

      // Load only the essential modules that actually exist
      // Load only the verified UI modules
      await this.loadModule('mol-plugin-ui', () => import('molstar/lib/mol-plugin-ui'));
      await this.loadModule('mol-plugin-ui/react18', () => import('molstar/lib/mol-plugin-ui/react18'));
      await this.loadModule('mol-plugin-ui/spec', () => import('molstar/lib/mol-plugin-ui/spec'));
      // Add theme and representation modules to prevent 'Empty' undefined errors
      await this.loadModule('mol-theme', () => import('molstar/lib/mol-theme/theme.js'));
      await this.loadModule('mol-theme-color', () => import('molstar/lib/mol-theme/color.js'));
      await this.loadModule('mol-theme-size', () => import('molstar/lib/mol-theme/size.js'));
      await this.loadModule('mol-repr-structure', () => import('molstar/lib/mol-repr/structure/representation.js'));

      this.isInitialized = true;
      console.log('[MolstarModuleLoader] All modules preloaded. isInitialized:', this.isInitialized);
      console.log('[MolstarModuleLoader] Loaded modules:', Array.from(this.loadedModules.keys()));
    } catch (error) {
      console.error('[MolstarModuleLoader] Failed to preload modules:', error);
      throw error;
    }
  }


  private async loadModule(name: string, loader: () => Promise<any>): Promise<void> {
    try {
      if (this.loadedModules.has(name)) {
        console.log(`[MolstarModuleLoader] Module already loaded: ${name}`);
        return; // Already loaded
      }
      console.log(`[MolstarModuleLoader] Loading module: ${name}`);
      const module = await loader();
      this.loadedModules.set(name, module);
      console.log(`[MolstarModuleLoader] Loaded module: ${name}`);
      console.log('[MolstarModuleLoader] Current loaded modules:', Array.from(this.loadedModules.keys()));
    } catch (error) {
      console.warn(`[MolstarModuleLoader] Failed to load module ${name}:`, error);
      throw error;
    }
  }

  getModule(name: string): any {
    return this.loadedModules.get(name);
  }

  isModuleLoaded(name: string): boolean {
    return this.loadedModules.has(name);
  }

  async createPluginUI(options: any): Promise<any> {
    if (!this.isInitialized) {
      await this.preloadEssentialModules();
    }

    const uiModule = this.getModule('mol-plugin-ui');
    if (!uiModule || !uiModule.createPluginUI) {
      throw new Error('Plugin UI module not loaded or createPluginUI not available');
    }

    return uiModule.createPluginUI(options);
  }

  getRenderFunction(): any {
    const reactModule = this.getModule('mol-plugin-ui/react18');
    if (!reactModule || !reactModule.renderReact18) {
      throw new Error('React18 render function not available');
    }
    return reactModule.renderReact18;
  }

  getDefaultSpec(): any {
    const specModule = this.getModule('mol-plugin-ui/spec');
    if (!specModule || !specModule.DefaultPluginUISpec) {
      throw new Error('DefaultPluginUISpec not available');
    }
    return specModule.DefaultPluginUISpec();
  }
}

export default MolstarModuleLoader;