// PDB Search Tool for LangGraph Integration
// Provides AI-driven protein structure database search capabilities

import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Input schema for PDB search
const PDBSearchSchema = z.object({
  query: z.string().describe("Search query for PDB database"),
  searchType: z.enum([
    "text", "sequence", "structure", "advanced", "similarity", "classification"
  ]).default("text").describe("Type of search to perform"),
  
  filters: z.object({
    resolution: z.object({
      min: z.number().optional(),
      max: z.number().optional()
    }).optional().describe("Resolution range in Angstroms"),
    
    releaseDate: z.object({
      start: z.string().optional(),
      end: z.string().optional()
    }).optional().describe("Release date range (YYYY-MM-DD)"),
    
    organism: z.string().optional().describe("Source organism"),
    
    experimentalMethod: z.enum([
      "X-RAY DIFFRACTION", "SOLUTION NMR", "ELECTRON MICROSCOPY", 
      "NEUTRON DIFFRACTION", "FIBER DIFFRACTION"
    ]).optional().describe("Experimental method used"),
    
    molecularWeight: z.object({
      min: z.number().optional(),
      max: z.number().optional()
    }).optional().describe("Molecular weight range in kDa"),
    
    chains: z.object({
      min: z.number().optional(),
      max: z.number().optional()
    }).optional().describe("Number of chains"),
    
    hasLigands: z.boolean().optional().describe("Must contain ligands"),
    
    classification: z.string().optional().describe("Protein classification")
  }).optional().describe("Search filters"),
  
  limit: z.number().min(1).max(100).default(10).describe("Maximum number of results"),
  
  sortBy: z.enum([
    "relevance", "resolution", "releaseDate", "id", "title"
  ]).default("relevance").describe("Sort results by")
});

export const PDBSearchTool = tool(
  async ({ query, searchType, filters = {}, limit, sortBy }) => {
    const startTime = Date.now();
    
    try {
      // Validate search query
      if (!query || query.trim().length === 0) {
        throw new Error("Search query cannot be empty");
      }

      // Perform search based on type
      let searchResults: any[];
      
      switch (searchType) {
        case "text":
          searchResults = await performTextSearch(query, filters, limit, sortBy);
          break;
        case "sequence":
          searchResults = await performSequenceSearch(query, filters, limit, sortBy);
          break;
        case "structure":
          searchResults = await performStructureSearch(query, filters, limit, sortBy);
          break;
        case "advanced":
          searchResults = await performAdvancedSearch(query, filters, limit, sortBy);
          break;
        case "similarity":
          searchResults = await performSimilaritySearch(query, filters, limit, sortBy);
          break;
        case "classification":
          searchResults = await performClassificationSearch(query, filters, limit, sortBy);
          break;
        default:
          throw new Error(`Unsupported search type: ${searchType}`);
      }

      const duration = Date.now() - startTime;

      // Format results
      const formattedResults = searchResults.map(result => formatSearchResult(result));

      return {
        success: true,
        searchType,
        query,
        results: formattedResults,
        totalFound: formattedResults.length,
        searchTime: duration,
        filters: filters,
        suggestions: generateSearchSuggestions(query, searchType, formattedResults),
        relatedQueries: generateRelatedQueries(query, searchType),
        summary: generateSearchSummary(query, searchType, formattedResults)
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown search error";
      
      return {
        success: false,
        searchType,
        query,
        error: errorMessage,
        searchTime: duration,
        suggestions: [
          "Try a different search term",
          "Use broader search criteria",
          "Check spelling and formatting"
        ]
      };
    }
  },
  {
    name: "pdb_search",
    description: "Search the Protein Data Bank (PDB) for molecular structures",
    schema: PDBSearchSchema
  }
);

// Search implementation functions
async function performTextSearch(
  query: string, 
  filters: any, 
  limit: number, 
  sortBy: string
): Promise<any[]> {
  // Mock text search implementation
  const mockResults = [
    {
      pdbId: "1A2B",
      title: "Crystal structure of example protein",
      resolution: 2.1,
      releaseDate: "2023-01-15",
      organism: "Homo sapiens",
      method: "X-RAY DIFFRACTION",
      chains: ["A", "B"],
      molecularWeight: 45.6,
      classification: "Transferase",
      hasLigands: true,
      relevanceScore: 0.95
    },
    {
      pdbId: "2C3D",
      title: "NMR structure of related protein",
      resolution: null,
      releaseDate: "2023-03-22",
      organism: "Mus musculus",
      method: "SOLUTION NMR",
      chains: ["A"],
      molecularWeight: 23.4,
      classification: "Hydrolase",
      hasLigands: false,
      relevanceScore: 0.87
    },
    {
      pdbId: "3E4F",
      title: "High-resolution structure of enzyme complex",
      resolution: 1.8,
      releaseDate: "2023-05-10",
      organism: "Escherichia coli",
      method: "X-RAY DIFFRACTION",
      chains: ["A", "B", "C"],
      molecularWeight: 78.9,
      classification: "Transferase/DNA complex",
      hasLigands: true,
      relevanceScore: 0.82
    }
  ];

  // Apply filters
  let filteredResults = mockResults.filter(result => 
    applyFilters(result, filters)
  );

  // Sort results
  filteredResults = sortResults(filteredResults, sortBy);

  // Apply limit
  return filteredResults.slice(0, limit);
}

async function performSequenceSearch(
  sequence: string, 
  filters: any, 
  limit: number, 
  sortBy: string
): Promise<any[]> {
  // Mock sequence search - would use BLAST or similar
  const mockResults = [
    {
      pdbId: "4G5H",
      title: "Protein with 85% sequence identity",
      sequenceIdentity: 0.85,
      eValue: 1e-50,
      alignmentLength: 234,
      resolution: 2.0,
      organism: "Homo sapiens",
      method: "X-RAY DIFFRACTION",
      chains: ["A"],
      classification: "Enzyme"
    },
    {
      pdbId: "5I6J",
      title: "Homologous protein structure",
      sequenceIdentity: 0.72,
      eValue: 3e-40,
      alignmentLength: 198,
      resolution: 1.9,
      organism: "Rattus norvegicus",
      method: "X-RAY DIFFRACTION",
      chains: ["A", "B"],
      classification: "Binding protein"
    }
  ];

  return applyFiltersAndSort(mockResults, filters, sortBy, limit);
}

async function performStructureSearch(
  structureQuery: string, 
  filters: any, 
  limit: number, 
  sortBy: string
): Promise<any[]> {
  // Mock structure search - would use structural alignment
  const mockResults = [
    {
      pdbId: "6K7L",
      title: "Structurally similar protein",
      structuralSimilarity: 0.78,
      rmsd: 2.1,
      alignedResidues: 156,
      resolution: 2.2,
      organism: "Saccharomyces cerevisiae",
      method: "X-RAY DIFFRACTION",
      classification: "Structural protein"
    }
  ];

  return applyFiltersAndSort(mockResults, filters, sortBy, limit);
}

async function performAdvancedSearch(
  query: string, 
  filters: any, 
  limit: number, 
  sortBy: string
): Promise<any[]> {
  // Mock advanced search with multiple criteria
  const mockResults = [
    {
      pdbId: "7M8N",
      title: "Multi-criteria search result",
      resolution: 1.95,
      releaseDate: "2023-08-15",
      organism: "Caenorhabditis elegans",
      method: "X-RAY DIFFRACTION",
      classification: "Complex",
      advancedScore: 0.91
    }
  ];

  return applyFiltersAndSort(mockResults, filters, sortBy, limit);
}

async function performSimilaritySearch(
  referenceId: string, 
  filters: any, 
  limit: number, 
  sortBy: string
): Promise<any[]> {
  // Mock similarity search based on reference structure
  const mockResults = [
    {
      pdbId: "8O9P",
      title: "Similar fold structure",
      similarity: 0.83,
      foldFamily: "Immunoglobulin-like",
      resolution: 2.3,
      organism: "Drosophila melanogaster",
      method: "X-RAY DIFFRACTION"
    }
  ];

  return applyFiltersAndSort(mockResults, filters, sortBy, limit);
}

async function performClassificationSearch(
  classification: string, 
  filters: any, 
  limit: number, 
  sortBy: string
): Promise<any[]> {
  // Mock classification-based search
  const mockResults = [
    {
      pdbId: "9Q0R",
      title: "Protein kinase structure",
      classification: "Transferase/Protein kinase",
      subClassification: "Serine/threonine kinase",
      resolution: 2.4,
      organism: "Homo sapiens",
      method: "X-RAY DIFFRACTION"
    }
  ];

  return applyFiltersAndSort(mockResults, filters, sortBy, limit);
}

// Helper functions
function applyFilters(result: any, filters: any): boolean {
  // Resolution filter
  if (filters.resolution) {
    if (filters.resolution.min && result.resolution < filters.resolution.min) return false;
    if (filters.resolution.max && result.resolution > filters.resolution.max) return false;
  }

  // Organism filter
  if (filters.organism && !result.organism?.toLowerCase().includes(filters.organism.toLowerCase())) {
    return false;
  }

  // Method filter
  if (filters.experimentalMethod && result.method !== filters.experimentalMethod) {
    return false;
  }

  // Molecular weight filter
  if (filters.molecularWeight) {
    if (filters.molecularWeight.min && result.molecularWeight < filters.molecularWeight.min) return false;
    if (filters.molecularWeight.max && result.molecularWeight > filters.molecularWeight.max) return false;
  }

  // Chains filter
  if (filters.chains) {
    const chainCount = result.chains?.length || 0;
    if (filters.chains.min && chainCount < filters.chains.min) return false;
    if (filters.chains.max && chainCount > filters.chains.max) return false;
  }

  // Ligands filter
  if (filters.hasLigands !== undefined && result.hasLigands !== filters.hasLigands) {
    return false;
  }

  return true;
}

function sortResults(results: any[], sortBy: string): any[] {
  return results.sort((a, b) => {
    switch (sortBy) {
      case "resolution":
        return (a.resolution || 999) - (b.resolution || 999);
      case "releaseDate":
        return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
      case "id":
        return a.pdbId.localeCompare(b.pdbId);
      case "title":
        return a.title.localeCompare(b.title);
      case "relevance":
      default:
        return (b.relevanceScore || b.similarity || 0) - (a.relevanceScore || a.similarity || 0);
    }
  });
}

function applyFiltersAndSort(results: any[], filters: any, sortBy: string, limit: number): any[] {
  const filtered = results.filter(result => applyFilters(result, filters));
  const sorted = sortResults(filtered, sortBy);
  return sorted.slice(0, limit);
}

function formatSearchResult(result: any): any {
  return {
    pdbId: result.pdbId,
    title: result.title,
    description: generateDescription(result),
    metadata: {
      resolution: result.resolution,
      releaseDate: result.releaseDate,
      organism: result.organism,
      experimentalMethod: result.method,
      classification: result.classification,
      chains: result.chains,
      molecularWeight: result.molecularWeight,
      hasLigands: result.hasLigands
    },
    scores: {
      relevance: result.relevanceScore,
      similarity: result.similarity,
      sequenceIdentity: result.sequenceIdentity,
      structuralSimilarity: result.structuralSimilarity
    },
    links: {
      pdbUrl: `https://www.rcsb.org/structure/${result.pdbId}`,
      downloadUrl: `https://files.rcsb.org/download/${result.pdbId}.pdb`,
      viewerUrl: `https://www.rcsb.org/3d-view/${result.pdbId}`
    }
  };
}

function generateDescription(result: any): string {
  const parts = [];
  
  if (result.resolution) {
    parts.push(`${result.resolution}Å resolution`);
  }
  
  if (result.method) {
    parts.push(result.method.toLowerCase().replace(/_/g, ' '));
  }
  
  if (result.organism) {
    parts.push(`from ${result.organism}`);
  }
  
  if (result.classification) {
    parts.push(`classified as ${result.classification.toLowerCase()}`);
  }

  return parts.join(', ');
}

function generateSearchSuggestions(query: string, searchType: string, results: any[]): string[] {
  const suggestions: string[] = [];
  
  if (results.length === 0) {
    suggestions.push("Try broader search terms");
    suggestions.push("Remove some filters");
    suggestions.push("Check spelling");
  } else {
    suggestions.push("Refine search with additional filters");
    suggestions.push("Sort by different criteria");
    suggestions.push("Load top result for analysis");
  }
  
  if (searchType === "text") {
    suggestions.push("Try sequence search if you have a sequence");
    suggestions.push("Use structure search for similar folds");
  }
  
  return suggestions;
}

function generateRelatedQueries(query: string, searchType: string): string[] {
  const related: string[] = [];
  
  // Generate related queries based on the original query
  if (query.toLowerCase().includes("kinase")) {
    related.push("protein kinase inhibitor", "kinase domain", "phosphorylation");
  }
  
  if (query.toLowerCase().includes("antibody")) {
    related.push("immunoglobulin", "antigen binding", "Fab fragment");
  }
  
  if (query.toLowerCase().includes("enzyme")) {
    related.push("active site", "catalytic domain", "substrate binding");
  }
  
  // Add search type specific suggestions
  if (searchType === "text") {
    related.push(`${query} structure`, `${query} complex`, `${query} mutant`);
  }
  
  return related.slice(0, 3); // Limit to 3 suggestions
}

function generateSearchSummary(query: string, searchType: string, results: any[]): string {
  if (results.length === 0) {
    return `No structures found for "${query}" using ${searchType} search.`;
  }
  
  const count = results.length;
  const resolutions = results
    .filter(r => r.metadata.resolution)
    .map(r => r.metadata.resolution);
  
  const avgRes = resolutions.length > 0 ? 
    (resolutions.reduce((a, b) => a + b, 0) / resolutions.length).toFixed(1) : null;
  
  let summary = `Found ${count} structure${count > 1 ? 's' : ''} for "${query}"`;
  
  if (avgRes) {
    summary += ` with average resolution ${avgRes}Å`;
  }
  
  const organisms = [...new Set(results.map(r => r.metadata.organism).filter(Boolean))];
  if (organisms.length > 0) {
    summary += `. Organisms include: ${organisms.slice(0, 3).join(', ')}`;
  }
  
  return summary + '.';
}