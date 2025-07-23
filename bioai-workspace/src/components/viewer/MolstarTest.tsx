import RobustMolstarViewer from './RobustMolstarViewer';
import type { ViewerControls } from './RobustMolstarViewer';
import { useRef, useEffect } from 'react';

interface MolstarTestProps {
  structureUrl?: string;
}

export default function MolstarTest({ structureUrl }: MolstarTestProps) {
  console.log('[MolstarTest] Rendering. Using RobustMolstarViewer.');
  const viewerRef = useRef<ViewerControls>(null);

  useEffect(() => {
    if (structureUrl && viewerRef.current) {
      console.log('[MolstarTest] Loading structure:', structureUrl);
      viewerRef.current.loadStructure(structureUrl).catch(console.error);
    }
  }, [structureUrl]);

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <RobustMolstarViewer ref={viewerRef}  />
    </div>
  );
} 