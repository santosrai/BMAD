import MolstarTest from '../components/viewer/MolstarTest';
import ChatInterface from '../components/chat/ChatInterface';
import { ResizablePanels } from '../components/layout/ResizablePanels';
import PDBSearchBar from '../components/pdb/PDBSearchBar';
import { useState } from 'react';
import type { PDBSearchResult } from '../services/pdb';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';

export default function Workspace() {
  const [selectedPDB, setSelectedPDB] = useState<PDBSearchResult | null>(null);
  const [isPDBPanelVisible, setIsPDBPanelVisible] = useState<boolean>(true);

  // Default to 1CRN if nothing selected
  const structureUrl = selectedPDB
    ? `https://files.rcsb.org/download/${selectedPDB.identifier}.pdb`
    : 'https://files.rcsb.org/download/1CRN.pdb';

  return (
    <div className="workspace">
      {/* <div className="workspace-header">
        <h1>BioAI Workspace</h1>
        <p>Your bioinformatics workspace with 3D molecular viewer.</p>
      </div> */}
      
      <div className="workspace-content">
        <ResizablePanels
          leftPanel={
            <div className="h-full p-6 flex flex-col">
              <ChatInterface className="flex-1 min-h-0" />
            </div>
          }
          rightPanel={
            <div className="h-full flex flex-col">
              <div className={`pdb-search-panel ${isPDBPanelVisible ? 'expanded' : 'collapsed'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-600" />
                    <h3 className="m-0 text-sm font-semibold">PDB Search</h3>
                  </div>
                  <button
                    onClick={() => setIsPDBPanelVisible(!isPDBPanelVisible)}
                    className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                    title={isPDBPanelVisible ? 'Hide search panel' : 'Show search panel'}
                  >
                    {isPDBPanelVisible ? (
                      <ChevronUp className="w-4 h-4 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                </div>
                {isPDBPanelVisible && (
                  <div className="pdb-search-content">
                    <PDBSearchBar onSelect={setSelectedPDB} />
                  </div>
                )}
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