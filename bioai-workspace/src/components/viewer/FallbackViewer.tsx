import { useState } from 'react';
import type { MolstarViewerProps } from '../../types/molstar';

export default function FallbackViewer({ 
  structureUrl, 
  onLoad, 
  onError, 
  className = '', 
  style = {} 
}: MolstarViewerProps) {
  const [viewerType, setViewerType] = useState<'placeholder' | 'external'>('placeholder');

  const handleExternalViewer = () => {
    if (structureUrl) {
      // Extract PDB ID from URL
      const pdbId = structureUrl.split('/').pop()?.split('.')[0] || '';
      
      if (pdbId) {
        // Open in RCSB PDB's 3D viewer
        window.open(`https://www.rcsb.org/3d-view/${pdbId}`, '_blank');
      }
    }
  };

  const handleDownloadStructure = () => {
    if (structureUrl) {
      const link = document.createElement('a');
      link.href = structureUrl;
      link.download = structureUrl.split('/').pop() || 'structure.pdb';
      link.click();
    }
  };

  return (
    <div 
      className={className}
      style={{ 
        width: '100%', 
        height: '100%', 
        minHeight: '300px',
        position: 'relative',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: '#f9fafb',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
        textAlign: 'center',
        ...style 
      }}
    >
      <div style={{ marginBottom: '1.5rem' }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      
      <h3 style={{ color: '#374151', marginBottom: '1rem' }}>
        3D Viewer Temporarily Unavailable
      </h3>
      
      <p style={{ color: '#6b7280', marginBottom: '2rem', maxWidth: '400px' }}>
        The molecular viewer is experiencing technical difficulties. 
        You can still access the structure using the options below.
      </p>

      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1rem',
        minWidth: '250px'
      }}>
        <button
          onClick={handleExternalViewer}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
            <polyline points="15,3 21,3 21,9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Open in RCSB PDB Viewer
        </button>

        <button
          onClick={handleDownloadStructure}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download Structure File
        </button>
      </div>

      <div style={{ 
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#eff6ff',
        border: '1px solid #dbeafe',
        borderRadius: '6px',
        fontSize: '0.8rem',
        color: '#1e40af',
        maxWidth: '400px'
      }}>
        <strong>💡 Tip:</strong> You can still use the chat interface to ask questions about molecular structures and get detailed analysis.
      </div>

      {structureUrl && (
        <div style={{ 
          marginTop: '1rem',
          fontSize: '0.75rem',
          color: '#6b7280'
        }}>
          Structure: {structureUrl.split('/').pop()?.split('.')[0] || 'Unknown'}
        </div>
      )}
    </div>
  );
}