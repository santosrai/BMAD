import MolstarTest from '../components/viewer/MolstarTest';
import ChatInterface from '../components/chat/ChatInterface';
import PDBSearchBar from '../components/pdb/PDBSearchBar';
import { useState } from 'react';
import type { PDBSearchResult } from '../services/pdb';

export default function Workspace() {
  const [selectedPDB, setSelectedPDB] = useState<PDBSearchResult | null>(null);

  // Default to 1CRN if nothing selected
  const structureUrl = selectedPDB
    ? `https://files.rcsb.org/download/${selectedPDB.identifier}.pdb`
    : 'https://files.rcsb.org/download/1CRN.pdb';

  return (
    <div className="workspace">
      <h1>BioAI Workspace</h1>
      <p>Your bioinformatics workspace with 3D molecular viewer.</p>
      
      <div className="workspace-content">
        <div className="workspace-left">
          <ChatInterface />
        </div>
        
        <div className="workspace-right">
          <div className="pdb-search-panel">
            <h3>PDB Search</h3>
            <PDBSearchBar onSelect={setSelectedPDB} />
          </div>
          <div className="viewer-panel">
            <h3>3D Molecular Viewer</h3>
            <div style={{ position: 'relative' }}>
              <MolstarTest structureUrl={structureUrl} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}