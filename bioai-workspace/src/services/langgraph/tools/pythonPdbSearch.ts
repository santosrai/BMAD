/**
 * Python PDB Search Tool
 * Routes to Python service for real PDB API integration (Python service required)
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";

const PythonPdbSearchSchema = z.object({
  searchType: z.enum(["id", "keyword", "organism", "resolution", "author"])
    .describe("Type of PDB search to perform"),
  query: z.string().describe("Search query (PDB ID, keywords, organism name, etc.)"),
  maxResults: z.number().default(20).describe("Maximum number of results to return"),
  filters: z.object({
    organism: z.string().optional().describe("Filter by organism"),
    resolutionMax: z.number().optional().describe("Maximum resolution in Angstroms"),
    resolutionMin: z.number().optional().describe("Minimum resolution in Angstroms"),
    experimentType: z.string().optional().describe("Experiment type filter")
  }).optional().describe("Additional search filters")
});

export const HybridPdbSearchTool = tool(
  async ({ searchType, query, maxResults, filters }) => {
    const startTime = Date.now();
    
    console.log('Python PDB Search:', {
      searchType,
      query,
      maxResults,
      hasFilters: !!filters
    });

    try {
      const pythonResult = await callPythonPdbSearch({
        searchType,
        query,
        maxResults,
        filters
      });

      if (pythonResult.success) {
        const duration = Date.now() - startTime;
        console.log(`Python PDB search completed in ${duration}ms`);
        return formatPdbSearchResult(pythonResult.data, 'python-service', duration);
      } else {
        throw new Error(pythonResult.error || 'Python service returned failure');
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Python PDB search failed after ${duration}ms:`, error.message);
      
      return {
        success: false,
        error: `Python service is required for PDB search. Error: ${error.message}`,
        searchType,
        query,
        executionTime: duration,
        service: 'python-service',
        results: []
      };
    }
  },
  {
    name: "python_pdb_search",
    description: `Search the Protein Data Bank (PDB) database with real API integration.
    Uses Python service for live PDB API access (Python service required).
    
    Search Types:
    - id: Search by specific PDB ID (e.g., "1ABC")
    - keyword: Search by keywords in title/description
    - organism: Search by organism name (e.g., "Homo sapiens")
    - resolution: Search by resolution range
    - author: Search by author name
    
    Returns detailed structure information including:
    - PDB ID, title, resolution, experiment type
    - Authors, organisms, deposition dates
    - Structure metadata and download links`,
    schema: PythonPdbSearchSchema,
  }
);

/**
 * Call Python microservice for PDB search
 */
async function callPythonPdbSearch(params: {
  searchType: string;
  query: string;
  maxResults: number;
  filters?: any;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  const pythonServiceUrl = process.env.PYTHON_LANGGRAPH_SERVICE_URL || "http://localhost:8000";
  
  try {
    const requestBody: any = {
      search_type: params.searchType,
      query: params.query,
      max_results: params.maxResults
    };

    // Add filters if provided
    if (params.filters) {
      if (params.filters.organism) {
        requestBody.organism = params.filters.organism;
      }
      if (params.filters.resolutionMax) {
        requestBody.resolution_max = params.filters.resolutionMax;
      }
    }

    const response = await fetch(`${pythonServiceUrl}/api/v1/molecular/pdb-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'bioai-workspace/1.0'
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(20000) // 20 second timeout for PDB searches
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (data.status === 'success' || data.entries) {
      return { success: true, data };
    } else {
      return { success: false, error: data.error || 'Search failed' };
    }

  } catch (error) {
    return { success: false, error: error.message };
  }
}


/**
 * Format PDB search result for consistent output
 */
function formatPdbSearchResult(data: any, service: string, executionTime: number): any {
  // Handle Python service response format
  return {
    success: true,
    searchType: data.search_term || 'unknown',
    totalCount: data.total_count || 0,
    returnedCount: data.returned_count || 0,
    results: data.entries || [data].filter(Boolean), // Handle single entry or multiple entries
    executionTime,
    service: 'python-langgraph-service',
    timestamp: new Date().toISOString(),
    apiSource: 'rcsb-pdb-api'
  };
}

export default HybridPdbSearchTool;