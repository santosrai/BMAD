// LangGraph Tools for Molecular Analysis and Viewer Control
// Exports all available tools for AI workflow integration

// Legacy tools (TypeScript only)
export { MolecularAnalysisTool } from './molecularAnalysis';
export { ViewerControlTool } from './viewerControl';
export { PdbSearchTool as PDBSearchTool } from './pdbSearch';

// Python-only tools (Python service required)
export { HybridMolecularAnalysisTool as PythonMolecularAnalysisTool } from './pythonMolecularAnalysis';
export { HybridPdbSearchTool as PythonPdbSearchTool } from './pythonPdbSearch';

// Tool registry for dynamic tool loading (Python service required)
export const AVAILABLE_TOOLS = {
  molecular_analysis: 'PythonMolecularAnalysisTool',
  viewer_control: 'ViewerControlTool',
  pdb_search: 'PythonPdbSearchTool'
} as const;

// Tool categories for organization
export const TOOL_CATEGORIES = {
  molecular: ['molecular_analysis'],
  structural: ['molecular_analysis', 'pdb_search'],
  visualization: ['viewer_control'],
  search: ['pdb_search'],
  analysis: ['molecular_analysis']
} as const;

// Export tool metadata for configuration (Python service required)
export const TOOL_METADATA = {
  molecular_analysis: {
    name: 'Python Molecular Analysis',
    description: 'Real molecular analysis using BioPython/Python service (Python service required)',
    category: 'molecular',
    version: '2.0.0',
    requiresStructure: true,
    estimatedDuration: 5000,
    capabilities: [
      'BioPython structure analysis',
      'Secondary structure prediction', 
      'Hydrogen bond detection',
      'Binding site prediction',
      'Sequence analysis',
      'Molecular properties'
    ],
    services: ['python-langgraph-service'],
    fallbackEnabled: false
  },
  viewer_control: {
    name: 'Viewer Control',
    description: 'Control molecular viewer display and interactions',
    category: 'visualization',
    version: '1.0.0',
    requiresStructure: false,
    estimatedDuration: 1000,
    services: ['typescript-engine']
  },
  pdb_search: {
    name: 'Python PDB Search',
    description: 'Real-time PDB database search using RCSB API (Python service required)',
    category: 'search',
    version: '2.0.0',
    requiresStructure: false,
    estimatedDuration: 3000,
    capabilities: [
      'Live RCSB PDB API integration',
      'Structure metadata retrieval',
      'Multi-criteria filtering',
      'Author and organism search',
      'Resolution-based filtering'
    ],
    services: ['python-langgraph-service'],
    fallbackEnabled: false
  }
} as const;