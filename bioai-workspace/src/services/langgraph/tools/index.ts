// LangGraph Tools for Molecular Analysis and Viewer Control
// Exports all available tools for AI workflow integration

export { MolecularAnalysisTool } from './molecularAnalysis';
export { ViewerControlTool } from './viewerControl';
export { PDBSearchTool } from './pdbSearch';

// Tool registry for dynamic tool loading
export const AVAILABLE_TOOLS = {
  molecular_analysis: 'MolecularAnalysisTool',
  viewer_control: 'ViewerControlTool',
  pdb_search: 'PDBSearchTool'
} as const;

// Tool categories for organization
export const TOOL_CATEGORIES = {
  molecular: ['molecular_analysis'],
  structural: ['molecular_analysis', 'pdb_search'],
  visualization: ['viewer_control'],
  search: ['pdb_search'],
  analysis: ['molecular_analysis']
} as const;

// Export tool metadata for configuration
export const TOOL_METADATA = {
  molecular_analysis: {
    name: 'Molecular Analysis',
    description: 'Analyze molecular structures, sequences, and properties',
    category: 'molecular',
    version: '1.0.0',
    requiresStructure: true,
    estimatedDuration: 5000
  },
  viewer_control: {
    name: 'Viewer Control',
    description: 'Control molecular viewer display and interactions',
    category: 'visualization',
    version: '1.0.0',
    requiresStructure: false,
    estimatedDuration: 1000
  },
  pdb_search: {
    name: 'PDB Search',
    description: 'Search and retrieve molecular structures from PDB',
    category: 'search',
    version: '1.0.0',
    requiresStructure: false,
    estimatedDuration: 3000
  }
} as const;