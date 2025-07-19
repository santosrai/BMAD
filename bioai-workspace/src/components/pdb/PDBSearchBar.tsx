import React, { useState, useEffect } from 'react';
import { searchPDB } from '../../services/pdb';
import type { PDBSearchResult } from '../../services/pdb';
import { usePDBHistory } from '../../hooks/usePDBHistory';

const SEARCH_MODES = [
  { label: 'PDB ID', value: 'id' },
  { label: 'Name', value: 'name' },
  { label: 'Keywords', value: 'keywords' },
];

interface SearchHistoryItem {
  query: string;
  mode: string;
}

interface PDBSearchBarProps {
  onSearch?: (query: string, mode: string) => void;
  onSelect?: (result: PDBSearchResult) => void;
}

export default function PDBSearchBar({ onSearch, onSelect }: PDBSearchBarProps) {
  const [mode, setMode] = useState('id');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PDBSearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const pdbHistory = usePDBHistory();

  // Map Convex or local history to SearchHistoryItem[]
  const history: SearchHistoryItem[] = (pdbHistory.history || []).map((h: any) => ({
    query: h.identifier || h.query,
    mode: h.mode || 'id',
  }));

  function validateInput(value: string, mode: string) {
    if (mode === 'id' && value && !/^\w{4}$/.test(value.trim())) {
      return 'PDB ID must be exactly 4 characters (e.g., 1TUP)';
    }
    return null;
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    setError(validateInput(value, mode));
    setShowResults(false);
  }

  function handleModeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setMode(e.target.value);
    setError(validateInput(query, e.target.value));
    setShowResults(false);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateInput(query, mode);
    setError(validation);
    if (validation) return;
    setLoading(true);
    setResults([]);
    setShowResults(false);
    try {
      const res = await searchPDB(query.trim(), mode as any);
      setResults(res);
      setShowResults(true);
      if (onSearch) onSearch(query.trim(), mode);
      setError(res.length === 0 ? 'No results found.' : null);
      if (res[0]) await pdbHistory.add(res[0]);
    } catch (err: any) {
      setError(err.message || 'Search failed');
      setResults([]);
      setShowResults(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(result: PDBSearchResult) {
    setShowResults(false);
    if (onSelect) onSelect(result);
    await pdbHistory.add(result);
  }

  function handleHistoryClick(item: SearchHistoryItem) {
    setMode(item.mode);
    setQuery(item.query);
    setError(null);
    setShowResults(false);
  }

  async function handleClearHistory() {
    await pdbHistory.clear();
  }

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {history.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#888', marginRight: 4 }}>Recent:</span>
          {history.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleHistoryClick(item)}
              style={{
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: 12,
                padding: '2px 12px',
                fontSize: 13,
                cursor: 'pointer',
                color: '#1976d2',
              }}
            >
              {item.mode === 'id' ? item.query.toUpperCase() : item.query}
              <span style={{ color: '#888', marginLeft: 4, fontSize: 11 }}>({item.mode})</span>
            </button>
          ))}
          <button
            onClick={handleClearHistory}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: 13,
              marginLeft: 8,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
            title="Clear search history"
          >
            Clear
          </button>
        </div>
      )}
      <form className="pdb-search-bar" onSubmit={handleSearch} style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
        <select value={mode} onChange={handleModeChange} style={{ padding: 4, borderRadius: 4 }}>
          {SEARCH_MODES.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={mode === 'id' ? 'e.g. 1TUP' : mode === 'name' ? 'Protein name' : 'Keywords'}
          style={{ flex: 1, padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
          autoComplete="off"
        />
        <button type="submit" style={{ padding: '6px 16px', borderRadius: 4, background: '#1976d2', color: '#fff', border: 'none', fontWeight: 500 }} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>
      {error && <div style={{ color: 'red', marginTop: 4, fontSize: 13 }}>{error}</div>}
      {showResults && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#fff',
          border: '1px solid #ccc',
          borderRadius: 4,
          zIndex: 10,
          marginTop: 2,
          maxHeight: 320,
          overflowY: 'auto',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          {results.map(r => (
            <div
              key={r.identifier}
              onClick={() => handleSelect(r)}
              style={{ padding: 10, cursor: 'pointer', borderBottom: '1px solid #eee' }}
              onMouseDown={e => e.preventDefault()}
            >
              <div style={{ fontWeight: 600 }}>{r.identifier} - {r.title}</div>
              <div style={{ fontSize: 13, color: '#555' }}>
                {r.organism && <span>Organism: {r.organism} </span>}
                {r.resolution && <span> | Resolution: {r.resolution}Å </span>}
                {r.experimentalMethod && <span> | Method: {r.experimentalMethod}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 