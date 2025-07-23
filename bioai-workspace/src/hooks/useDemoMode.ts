import { useState, useEffect, useCallback } from 'react';

const DEMO_MODE_KEY = 'bioai-demo-mode';

export interface DemoModeState {
  isDemoMode: boolean;
  isEnvDemo: boolean;
  canToggle: boolean;
}

export function useDemoMode() {
  const [demoState, setDemoState] = useState<DemoModeState>(() => {
    // Check environment variable
    const envDemo = import.meta.env.VITE_DEMO_MODE === 'true';
    
    // Check localStorage preference
    const storedDemo = localStorage.getItem(DEMO_MODE_KEY);
    const localDemo = storedDemo === 'true';
    
    // Demo mode is active if either env var is true OR localStorage is true
    const isDemoMode = envDemo || localDemo;
    
    return {
      isDemoMode,
      isEnvDemo: envDemo,
      canToggle: !envDemo, // Can only toggle if not forced by env var
    };
  });

  // Update demo state when storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const envDemo = import.meta.env.VITE_DEMO_MODE === 'true';
      const storedDemo = localStorage.getItem(DEMO_MODE_KEY);
      const localDemo = storedDemo === 'true';
      
      setDemoState({
        isDemoMode: envDemo || localDemo,
        isEnvDemo: envDemo,
        canToggle: !envDemo,
      });
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const enableDemoMode = useCallback(() => {
    if (!demoState.canToggle) {
      console.warn('Cannot toggle demo mode - controlled by environment variable');
      return;
    }

    console.log('🚀 Enabling demo mode');
    localStorage.setItem(DEMO_MODE_KEY, 'true');
    
    // Update state immediately
    setDemoState(prev => ({
      ...prev,
      isDemoMode: true,
    }));
    
    // Restart app to apply demo mode
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }, [demoState.canToggle]);

  const disableDemoMode = useCallback(() => {
    if (!demoState.canToggle) {
      console.warn('Cannot toggle demo mode - controlled by environment variable');
      return;
    }

    console.log('🔒 Disabling demo mode - app will restart and redirect to login');
    
    // Remove demo mode from localStorage
    localStorage.removeItem(DEMO_MODE_KEY);
    
    // Clear any other auth-related cache
    localStorage.removeItem('pdb-search-history-v1');
    
    // Update state immediately
    setDemoState(prev => ({
      ...prev,
      isDemoMode: false,
    }));
    
    // Force app restart to exit demo mode and trigger auth flow
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }, [demoState.canToggle]);

  const toggleDemoMode = useCallback((enabled: boolean) => {
    if (enabled) {
      enableDemoMode();
    } else {
      disableDemoMode();
    }
  }, [enableDemoMode, disableDemoMode]);

  return {
    ...demoState,
    enableDemoMode,
    disableDemoMode,
    toggleDemoMode,
  };
}