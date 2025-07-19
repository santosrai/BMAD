import React, { useRef, useEffect } from 'react';
import RobustMolstarViewer from './RobustMolstarViewer';
import type { ViewerControls } from './RobustMolstarViewer';

export default function MolstarTest() {
  console.log('[MolstarTest] Rendering. Using RobustMolstarViewer.');
  const viewerRef = useRef<ViewerControls>(null);

  useEffect(() => {
    // Load a sample PDB structure on mount
    viewerRef.current?.loadStructure('https://files.rcsb.org/download/1C0A.pdb');
  }, []);

  return (
    <RobustMolstarViewer ref={viewerRef}  />
  );
} 