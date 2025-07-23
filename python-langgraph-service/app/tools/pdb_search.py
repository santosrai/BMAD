"""
Real PDB database integration using RCSB PDB REST API.
Replaces the mock implementation from the TypeScript version.
"""

import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime
import json

import aiohttp
import structlog
from pydantic import BaseModel

logger = structlog.get_logger(__name__)


class PDBEntry(BaseModel):
    """Model for PDB entry data."""
    pdb_id: str
    title: str
    resolution: Optional[float] = None
    experiment_type: str = ""
    deposition_date: Optional[str] = None
    release_date: Optional[str] = None
    authors: List[str] = []
    organism: List[str] = []
    chains: List[str] = []
    molecular_weight: Optional[float] = None


class PDBSearchEngine:
    """Real PDB database search using RCSB PDB API."""
    
    def __init__(self):
        self.base_url = "https://search.rcsb.org/rcsbsearch/v2/query"
        self.data_url = "https://data.rcsb.org/rest/v1/core"
        self.session = None
        
    async def __aenter__(self):
        """Async context manager entry."""
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.session:
            await self.session.close()
    
    async def search_by_id(self, pdb_id: str) -> Dict[str, Any]:
        """
        Search for a specific PDB entry by ID.
        
        Args:
            pdb_id: PDB ID (e.g., '1ABC')
            
        Returns:
            Dictionary containing PDB entry data
        """
        logger.info("Searching PDB by ID", pdb_id=pdb_id)
        
        try:
            pdb_id = pdb_id.upper().strip()
            
            if not self.session:
                self.session = aiohttp.ClientSession()
            
            # Get detailed information about the PDB entry
            url = f"{self.data_url}/entry/{pdb_id}"
            
            async with self.session.get(url) as response:
                if response.status == 404:
                    return {
                        "error": f"PDB entry {pdb_id} not found",
                        "status": "not_found",
                        "pdb_id": pdb_id
                    }
                elif response.status != 200:
                    return {
                        "error": f"PDB API returned status {response.status}",
                        "status": "api_error",
                        "pdb_id": pdb_id
                    }
                
                data = await response.json()
                
                # Parse the response into our format
                result = await self._parse_pdb_entry(data, pdb_id)
                
                # Get additional structural data
                structural_data = await self._get_structural_data(pdb_id)
                result.update(structural_data)
                
                logger.info("PDB search completed", pdb_id=pdb_id, status="success")
                return result
                
        except Exception as e:
            logger.error("PDB search failed", pdb_id=pdb_id, error=str(e))
            return {
                "error": str(e),
                "status": "error",
                "pdb_id": pdb_id
            }
    
    async def search_by_keyword(
        self, 
        keyword: str, 
        max_results: int = 50,
        organism: Optional[str] = None,
        resolution_max: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Search PDB database by keyword.
        
        Args:
            keyword: Search term
            max_results: Maximum number of results to return
            organism: Filter by organism name
            resolution_max: Maximum resolution filter
            
        Returns:
            Dictionary containing search results
        """
        logger.info("Searching PDB by keyword", keyword=keyword, max_results=max_results)
        
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()
            
            # Build search query
            query = {
                "query": {
                    "type": "terminal",
                    "service": "text",
                    "parameters": {
                        "attribute": "struct.title",
                        "operator": "contains_words",
                        "value": keyword
                    }
                },
                "return_type": "entry",
                "request_options": {
                    "results_content_type": ["experimental"],
                    "sort": [{"sort_by": "score", "direction": "desc"}],
                    "scoring_strategy": "combined"
                }
            }
            
            # Add organism filter if specified
            if organism:
                query = {
                    "query": {
                        "type": "group",
                        "logical_operator": "and",
                        "nodes": [
                            query["query"],
                            {
                                "type": "terminal",
                                "service": "text",
                                "parameters": {
                                    "attribute": "rcsb_entity_source_organism.taxonomy_lineage.name",
                                    "operator": "contains_words",
                                    "value": organism
                                }
                            }
                        ]
                    },
                    "return_type": "entry",
                    "request_options": query["request_options"]
                }
            
            # Add resolution filter if specified
            if resolution_max:
                resolution_filter = {
                    "type": "terminal",
                    "service": "text",
                    "parameters": {
                        "attribute": "rcsb_entry_info.resolution_combined",
                        "operator": "less_or_equal",
                        "value": resolution_max
                    }
                }
                
                if "nodes" in query["query"]:
                    query["query"]["nodes"].append(resolution_filter)
                else:
                    query = {
                        "query": {
                            "type": "group",
                            "logical_operator": "and", 
                            "nodes": [query["query"], resolution_filter]
                        },
                        "return_type": "entry",
                        "request_options": query["request_options"]
                    }
            
            # Execute search
            async with self.session.post(self.base_url, json=query) as response:
                if response.status != 200:
                    return {
                        "error": f"Search API returned status {response.status}",
                        "status": "api_error",
                        "keyword": keyword
                    }
                
                data = await response.json()
                
                # Parse results
                results = await self._parse_search_results(data, keyword, max_results)
                
                logger.info("PDB keyword search completed", 
                          keyword=keyword, 
                          results_count=len(results.get("entries", [])))
                
                return results
                
        except Exception as e:
            logger.error("PDB keyword search failed", keyword=keyword, error=str(e))
            return {
                "error": str(e),
                "status": "error",
                "keyword": keyword
            }
    
    async def search_by_organism(self, organism: str, max_results: int = 50) -> Dict[str, Any]:
        """Search PDB database by organism."""
        logger.info("Searching PDB by organism", organism=organism)
        return await self.search_by_keyword("", max_results, organism=organism)
    
    async def search_by_resolution(
        self, 
        min_resolution: float = 0.0, 
        max_resolution: float = 3.0,
        max_results: int = 50
    ) -> Dict[str, Any]:
        """
        Search PDB database by resolution range.
        
        Args:
            min_resolution: Minimum resolution in Angstroms
            max_resolution: Maximum resolution in Angstroms
            max_results: Maximum number of results
            
        Returns:
            Dictionary containing search results
        """
        logger.info("Searching PDB by resolution", 
                   min_res=min_resolution, max_res=max_resolution)
        
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()
            
            query = {
                "query": {
                    "type": "group",
                    "logical_operator": "and",
                    "nodes": [
                        {
                            "type": "terminal",
                            "service": "text",
                            "parameters": {
                                "attribute": "rcsb_entry_info.resolution_combined",
                                "operator": "greater_or_equal",
                                "value": min_resolution
                            }
                        },
                        {
                            "type": "terminal", 
                            "service": "text",
                            "parameters": {
                                "attribute": "rcsb_entry_info.resolution_combined",
                                "operator": "less_or_equal",
                                "value": max_resolution
                            }
                        }
                    ]
                },
                "return_type": "entry",
                "request_options": {
                    "results_content_type": ["experimental"],
                    "sort": [{"sort_by": "rcsb_entry_info.resolution_combined", "direction": "asc"}]
                }
            }
            
            async with self.session.post(self.base_url, json=query) as response:
                if response.status != 200:
                    return {
                        "error": f"Resolution search API returned status {response.status}",
                        "status": "api_error",
                        "resolution_range": f"{min_resolution}-{max_resolution}"
                    }
                
                data = await response.json()
                results = await self._parse_search_results(
                    data, f"resolution:{min_resolution}-{max_resolution}", max_results
                )
                
                logger.info("PDB resolution search completed", 
                          results_count=len(results.get("entries", [])))
                
                return results
                
        except Exception as e:
            logger.error("PDB resolution search failed", error=str(e))
            return {
                "error": str(e),
                "status": "error",
                "resolution_range": f"{min_resolution}-{max_resolution}"
            }
    
    async def download_structure(self, pdb_id: str) -> Dict[str, Any]:
        """
        Download PDB structure file.
        
        Args:
            pdb_id: PDB ID to download
            
        Returns:
            Dictionary with structure data and metadata
        """
        logger.info("Downloading PDB structure", pdb_id=pdb_id)
        
        try:
            pdb_id = pdb_id.upper().strip()
            
            if not self.session:
                self.session = aiohttp.ClientSession()
            
            # Download PDB file
            pdb_url = f"https://files.rcsb.org/download/{pdb_id}.pdb"
            
            async with self.session.get(pdb_url) as response:
                if response.status == 404:
                    return {
                        "error": f"PDB structure file for {pdb_id} not found",
                        "status": "not_found",
                        "pdb_id": pdb_id
                    }
                elif response.status != 200:
                    return {
                        "error": f"Download failed with status {response.status}",
                        "status": "download_error",
                        "pdb_id": pdb_id
                    }
                
                pdb_content = await response.text()
                
                # Get metadata
                metadata = await self.search_by_id(pdb_id)
                
                result = {
                    "pdb_id": pdb_id,
                    "status": "success",
                    "structure_data": pdb_content,
                    "file_size": len(pdb_content),
                    "download_timestamp": datetime.utcnow().isoformat(),
                    "metadata": metadata
                }
                
                logger.info("PDB structure downloaded", pdb_id=pdb_id, size=len(pdb_content))
                return result
                
        except Exception as e:
            logger.error("PDB structure download failed", pdb_id=pdb_id, error=str(e))
            return {
                "error": str(e),
                "status": "error",
                "pdb_id": pdb_id
            }
    
    async def _parse_pdb_entry(self, data: Dict[str, Any], pdb_id: str) -> Dict[str, Any]:
        """Parse PDB API response into standardized format."""
        try:
            entry = data
            
            # Extract basic information
            result = {
                "pdb_id": pdb_id,
                "status": "success",
                "title": entry.get("struct", {}).get("title", ""),
                "experiment_type": entry.get("exptl", [{}])[0].get("method", "") if entry.get("exptl") else "",
                "resolution": entry.get("rcsb_entry_info", {}).get("resolution_combined"),
                "deposition_date": entry.get("rcsb_accession_info", {}).get("deposit_date"),
                "release_date": entry.get("rcsb_accession_info", {}).get("initial_release_date"),
                "molecular_weight": entry.get("rcsb_entry_info", {}).get("molecular_weight")
            }
            
            # Extract authors
            if "audit_author" in entry:
                result["authors"] = [author.get("name", "") for author in entry["audit_author"]]
            
            # Extract organism information
            organisms = []
            if "rcsb_entity_source_organism" in entry:
                for org in entry["rcsb_entity_source_organism"]:
                    if "ncbi_scientific_name" in org:
                        organisms.append(org["ncbi_scientific_name"])
            result["organism"] = organisms
            
            # Extract chain information  
            chains = []
            if "rcsb_entry_info" in entry and "polymer_entity_count_protein" in entry["rcsb_entry_info"]:
                chains = [f"Chain_{i}" for i in range(entry["rcsb_entry_info"]["polymer_entity_count_protein"])]
            result["chains"] = chains
            
            return result
            
        except Exception as e:
            logger.warning("Failed to parse PDB entry", pdb_id=pdb_id, error=str(e))
            return {
                "pdb_id": pdb_id,
                "status": "parse_error",
                "error": str(e)
            }
    
    async def _parse_search_results(
        self, 
        data: Dict[str, Any], 
        search_term: str, 
        max_results: int
    ) -> Dict[str, Any]:
        """Parse search results from PDB API."""
        try:
            result = {
                "search_term": search_term,
                "status": "success",
                "total_count": data.get("total_count", 0),
                "returned_count": 0,
                "entries": []
            }
            
            if "result_set" not in data:
                return result
            
            # Process each result
            for item in data["result_set"][:max_results]:
                pdb_id = item.get("identifier")
                if pdb_id:
                    # Get detailed info for each entry
                    entry_data = await self.search_by_id(pdb_id)
                    if entry_data.get("status") == "success":
                        result["entries"].append(entry_data)
                        result["returned_count"] += 1
            
            return result
            
        except Exception as e:
            logger.warning("Failed to parse search results", error=str(e))
            return {
                "search_term": search_term,
                "status": "parse_error",
                "error": str(e),
                "entries": []
            }
    
    async def _get_structural_data(self, pdb_id: str) -> Dict[str, Any]:
        """Get additional structural information."""
        try:
            # Get assembly information
            assembly_url = f"{self.data_url}/assembly/{pdb_id}/1"
            
            async with self.session.get(assembly_url) as response:
                if response.status == 200:
                    assembly_data = await response.json()
                    return {
                        "assembly_info": {
                            "oligomeric_count": assembly_data.get("oligomeric_count", 1),
                            "oligomeric_details": assembly_data.get("oligomeric_details", "")
                        }
                    }
            
            return {}
            
        except Exception as e:
            logger.warning("Failed to get structural data", pdb_id=pdb_id, error=str(e))
            return {}