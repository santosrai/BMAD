import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { MolstarViewerPreferences } from '../types/molstar';

interface ViewerState {
  currentStructure: string | null;
  viewerPreferences: MolstarViewerPreferences;
  recentStructures: string[];
  sessionState: {
    structureUrl?: string;
    camera?: any;
    representations?: any[];
    selections?: any[];
  } | null;
}

interface ViewerActions {
  loadStructure: (url: string) => Promise<void>;
  updatePreferences: (preferences: Partial<MolstarViewerPreferences>) => Promise<void>;
  saveSessionState: (state: any) => Promise<void>;
  clearRecentStructures: () => Promise<void>;
  addToRecent: (url: string) => void;
}

export const useMolstarViewer = (userId: string) => {
  const [state, setState] = useState<ViewerState>({
    currentStructure: null,
    viewerPreferences: {
      performanceMode: 'auto',
      autoRotate: false,
      showAxes: true,
      backgroundColor: '#ffffff',
      representationStyle: 'cartoon',
    },
    recentStructures: [],
    sessionState: null,
  });

  // Convex queries and mutations
  const userPrefs = useQuery(api.molstarPreferences.getUserPreferences, userId ? { userId } : 'skip');
  const updatePrefsMutation = useMutation(api.molstarPreferences.updatePreferences);
  const saveSessionMutation = useMutation(api.molstarPreferences.saveSession);

  const saveToLocalStorage = useCallback((newState: ViewerState) => {
    try {
      localStorage.setItem(`molstar-preferences-${userId}`, JSON.stringify({
        preferences: newState.viewerPreferences,
        recentStructures: newState.recentStructures,
        lastUpdated: Date.now(),
      }));
    } catch (error) {
      console.warn('Failed to save preferences to localStorage:', error);
    }
  }, [userId]);

  // Load preferences from Convex
  useEffect(() => {
    if (userPrefs) {
      setState(prev => {
        const newState = {
          ...prev,
          viewerPreferences: {
            ...prev.viewerPreferences,
            ...userPrefs.preferences,
          },
          recentStructures: userPrefs.recentStructures || [],
          sessionState: userPrefs.lastSession || null,
        };
        saveToLocalStorage(newState);
        return newState;
      });
    }
  }, [userPrefs, saveToLocalStorage]);

  // Load preferences from localStorage as fallback
  useEffect(() => {
    const savedPrefs = localStorage.getItem(`molstar-preferences-${userId}`);
    if (savedPrefs && !userPrefs) {
      try {
        const parsed = JSON.parse(savedPrefs);
        setState(prev => {
          const newState = {
            ...prev,
            viewerPreferences: { ...prev.viewerPreferences, ...parsed.preferences },
            recentStructures: parsed.recentStructures || [],
          };
          return newState;
        });
      } catch (error) {
        console.warn('Failed to parse saved preferences:', error);
      }
    }
  }, [userId, userPrefs]);

  const addToRecent = useCallback((url: string) => {
    setState(prev => {
      const filtered = prev.recentStructures.filter(s => s !== url);
      const newRecent = [url, ...filtered].slice(0, 10);
      const newState = { ...prev, recentStructures: newRecent };
      saveToLocalStorage(newState);
      updatePrefsMutation({
        userId,
        preferences: prev.viewerPreferences,
        recentStructures: newRecent,
      }).catch(error => console.warn('Failed to update recent structures:', error));
      return newState;
    });
  }, [userId, updatePrefsMutation, saveToLocalStorage]);

  const loadStructure = useCallback(async (url: string) => {
    setState(prev => ({ ...prev, currentStructure: url }));
    addToRecent(url);
  }, [addToRecent]);

  const updatePreferences = useCallback(async (preferences: Partial<MolstarViewerPreferences>) => {
    setState(prev => {
      const newPrefs = { ...prev.viewerPreferences, ...preferences };
      const newState = { ...prev, viewerPreferences: newPrefs };
      saveToLocalStorage(newState);
      updatePrefsMutation({
        userId,
        preferences: newPrefs,
      }).catch(error => console.warn('Failed to save preferences to Convex:', error));
      return newState;
    });
  }, [userId, updatePrefsMutation, saveToLocalStorage]);

  const saveSessionState = useCallback(async (sessionState: any) => {
    setState(prev => {
      const newState = { ...prev, sessionState };
      saveSessionMutation({
        userId,
        sessionState,
        structureUrl: prev.currentStructure || undefined,
      }).catch(error => console.warn('Failed to save session state:', error));
      return newState;
    });
  }, [userId, saveSessionMutation]);

  const clearRecentStructures = useCallback(async () => {
    setState(prev => {
      const newState = { ...prev, recentStructures: [] };
      saveToLocalStorage(newState);
      updatePrefsMutation({
        userId,
        preferences: prev.viewerPreferences,
        recentStructures: [],
      }).catch(error => console.warn('Failed to clear recent structures:', error));
      return newState;
    });
  }, [userId, updatePrefsMutation, saveToLocalStorage]);

  const actions = useMemo(() => ({
    loadStructure,
    updatePreferences,
    saveSessionState,
    clearRecentStructures,
    addToRecent,
  }), [loadStructure, updatePreferences, saveSessionState, clearRecentStructures, addToRecent]);

  return {
    state,
    actions,
    isLoading: !userPrefs && userId,
  };
};