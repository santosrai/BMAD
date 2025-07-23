import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from './useAuth';
import type { PDBSearchResult } from '../services/pdb';

export function usePDBHistory() {
  const { user, isDemoMode } = useAuth();
  const userId = user?.id;

  // Convex functions - skip if in demo mode to avoid auth issues
  const history = useQuery(
    api.pdb.getPDBHistory, 
    (userId && !isDemoMode) ? { userId } : 'skip'
  ) || [];
  const addPDBToHistory = useMutation(api.pdb.addPDBToHistory);
  const clearPDBHistory = useMutation(api.pdb.clearPDBHistory);

  // Fallback to local history if not logged in or in demo mode
  function getLocalHistory(): PDBSearchResult[] {
    try {
      const raw = localStorage.getItem('pdb-search-history-v1');
      if (!raw) return [];
      return JSON.parse(raw).map((h: any) => ({
        identifier: h.identifier || h.query,
        title: h.title || h.query,
        organism: h.organism,
        resolution: h.resolution,
        experimentalMethod: h.experimentalMethod,
      }));
    } catch {
      return [];
    }
  }

  function setLocalHistory(newHistory: PDBSearchResult[]) {
    try {
      localStorage.setItem('pdb-search-history-v1', JSON.stringify(newHistory.slice(0, 10)));
    } catch {
      // Ignore localStorage errors
    }
  }

  return {
    history: (userId && !isDemoMode) ? history : getLocalHistory(),
    add: async (result: PDBSearchResult) => {
      if (userId && !isDemoMode) {
        // Use Convex for authenticated, non-demo users
        try {
          await addPDBToHistory({
            userId,
            identifier: result.identifier,
            title: result.title,
            organism: result.organism,
            resolution: result.resolution,
            experimentalMethod: result.experimentalMethod,
          });
        } catch (error) {
          console.warn('Failed to add to Convex history, falling back to local storage:', error);
          // Fallback to local storage if Convex fails
          const currentHistory = getLocalHistory();
          const newHistory = [result, ...currentHistory.filter(h => h.identifier !== result.identifier)];
          setLocalHistory(newHistory);
        }
      } else {
        // Use local storage for demo mode or non-authenticated users
        const currentHistory = getLocalHistory();
        const newHistory = [result, ...currentHistory.filter(h => h.identifier !== result.identifier)];
        setLocalHistory(newHistory);
      }
    },
    clear: async () => {
      if (userId && !isDemoMode) {
        try {
          await clearPDBHistory({ userId });
        } catch (error) {
          console.warn('Failed to clear Convex history:', error);
        }
      }
      // Always clear local storage as fallback
      localStorage.removeItem('pdb-search-history-v1');
    },
    isConvex: !!(userId && !isDemoMode),
  };
} 