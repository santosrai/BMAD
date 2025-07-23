import MolstarTest from '../components/viewer/MolstarTest';
import ChatInterface from '../components/chat/ChatInterface';
import { ResizablePanels } from '../components/layout/ResizablePanels';
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
      <div className="workspace-header">
        <h1>BioAI Workspace</h1>
        <p>Your bioinformatics workspace with 3D molecular viewer.</p>
      </div>
      
      <div className="workspace-content">
        <ResizablePanels
          leftPanel={
            <div className="h-full p-6 flex flex-col">
              <ChatInterface className="flex-1 min-h-0" />
            </div>
          }
          rightPanel={
            <div className="h-full flex flex-col">
              <div className="pdb-search-panel">
                <h3>PDB Search</h3>
                <PDBSearchBar onSelect={setSelectedPDB} />
              </div>
              <div className="viewer-panel flex-1">
                <h3>3D Molecular Viewer</h3>
                <div style={{ position: 'relative', height: 'calc(100% - 60px)' }}>
                  <MolstarTest structureUrl={structureUrl} />
                </div>
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}