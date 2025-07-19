import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from './useAuth';
import type { PDBSearchResult } from '../services/pdb';

export function usePDBHistory() {
  const { user } = useAuth();
  const userId = user?.id;

  // Convex functions
  const history = useQuery(api.pdb.getPDBHistory, userId ? { userId } : 'skip') || [];
  const addPDBToHistory = useMutation(api.pdb.addPDBToHistory);
  const clearPDBHistory = useMutation(api.pdb.clearPDBHistory);

  // Fallback to local history if not logged in
  function getLocalHistory(): PDBSearchResult[] {
    try {
      const raw = localStorage.getItem('pdb-search-history-v1');
      if (!raw) return [];
      return JSON.parse(raw).map((h: any) => ({
        identifier: h.query,
        title: h.query,
      }));
    } catch {
      return [];
    }
  }

  return {
    history: userId ? history : getLocalHistory(),
    add: async (result: PDBSearchResult) => {
      if (userId) {
        await addPDBToHistory({
          userId,
          identifier: result.identifier,
          title: result.title,
          organism: result.organism,
          resolution: result.resolution,
          experimentalMethod: result.experimentalMethod,
        });
      }
    },
    clear: async () => {
      if (userId) {
        await clearPDBHistory({ userId });
      }
    },
    isConvex: !!userId,
  };
} 