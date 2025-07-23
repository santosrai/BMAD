"""
Molecular analysis API endpoints.
Replaces the mock implementations from TypeScript with real scientific computing.
"""

import asyncio
from typing import Dict, Any, Optional, List
import uuid
from datetime import datetime

import structlog
from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File
from pydantic import BaseModel, Field

from ...tools.molecular_analysis import MolecularAnalyzer
from ...tools.pdb_search import PDBSearchEngine
from ...tools.small_molecule_analysis import SmallMoleculeAnalyzer
from ...tools.structure_comparison import StructureComparator

logger = structlog.get_logger(__name__)
router = APIRouter()

# Global analyzers
molecular_analyzer = MolecularAnalyzer()
small_molecule_analyzer = SmallMoleculeAnalyzer()
structure_comparator = StructureComparator()


class MolecularAnalysisRequest(BaseModel):
    """Request model for molecular analysis."""
    structure_data: str = Field(..., description="PDB structure data")
    structure_id: Optional[str] = Field(None, description="Structure identifier")
    analysis_type: str = Field("comprehensive", description="Type of analysis")


class PDBSearchRequest(BaseModel):
    """Request model for PDB search."""
    search_type: str = Field(..., description="Type of search (id, keyword, organism, resolution)")
    query: str = Field(..., description="Search query")
    max_results: Optional[int] = Field(50, description="Maximum results to return")
    organism: Optional[str] = Field(None, description="Organism filter")
    resolution_max: Optional[float] = Field(None, description="Maximum resolution")


class SmallMoleculeRequest(BaseModel):
    """Request model for small molecule analysis."""
    compound_data: str = Field(..., description="Molecular data (SMILES, etc.)")
    data_format: str = Field("smiles", description="Data format")
    compound_name: Optional[str] = Field("unknown", description="Compound name")


class StructureComparisonRequest(BaseModel):
    """Request model for structure comparison."""
    structure1_data: str = Field(..., description="First structure PDB data")
    structure2_data: str = Field(..., description="Second structure PDB data")
    structure1_id: Optional[str] = Field("structure_1", description="First structure ID")
    structure2_id: Optional[str] = Field("structure_2", description="Second structure ID")
    alignment_method: str = Field("ca_atoms", description="Alignment method")


@router.post("/molecular-analysis")
async def analyze_molecular_structure(request: MolecularAnalysisRequest):
    """
    Analyze molecular structure using BioPython.
    Replaces the mock implementation from molecularAnalysis.ts
    """
    analysis_id = str(uuid.uuid4())
    structure_id = request.structure_id or f"structure_{analysis_id[:8]}"
    
    logger.info("Molecular analysis requested", 
               analysis_id=analysis_id, 
               structure_id=structure_id,
               type=request.analysis_type)
    
    try:
        # Perform real molecular analysis
        result = await molecular_analyzer.analyze_structure(
            structure_data=request.structure_data,
            structure_id=structure_id,
            analysis_type=request.analysis_type
        )
        
        # Add metadata for compatibility with existing system
        result.update({
            "analysis_id": analysis_id,
            "service": "python-langgraph-service",
            "timestamp": datetime.utcnow().isoformat(),
            "type": "molecular_analysis"
        })
        
        return result
        
    except Exception as e:
        logger.error("Molecular analysis failed", 
                    analysis_id=analysis_id, error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Molecular analysis failed: {str(e)}"
        )


@router.post("/pdb-search")
async def search_pdb_database(request: PDBSearchRequest):
    """
    Search PDB database using RCSB PDB API.
    Replaces the mock implementation from pdbSearch.ts
    """
    search_id = str(uuid.uuid4())
    
    logger.info("PDB search requested",
               search_id=search_id,
               search_type=request.search_type,
               query=request.query)
    
    try:
        async with PDBSearchEngine() as pdb_search:
            if request.search_type == "id":
                result = await pdb_search.search_by_id(request.query)
                
            elif request.search_type == "keyword":
                result = await pdb_search.search_by_keyword(
                    keyword=request.query,
                    max_results=request.max_results,
                    organism=request.organism,
                    resolution_max=request.resolution_max
                )
                
            elif request.search_type == "organism":
                result = await pdb_search.search_by_organism(
                    organism=request.query,
                    max_results=request.max_results
                )
                
            elif request.search_type == "resolution":
                # Parse resolution range from query (e.g., "1.0-2.5")
                try:
                    if "-" in request.query:
                        min_res, max_res = map(float, request.query.split("-"))
                    else:
                        min_res, max_res = 0.0, float(request.query)
                    
                    result = await pdb_search.search_by_resolution(
                        min_resolution=min_res,
                        max_resolution=max_res,
                        max_results=request.max_results
                    )
                except ValueError:
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid resolution format. Use '2.5' or '1.0-2.5'"
                    )
                    
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown search type: {request.search_type}"
                )
        
        # Add metadata
        result.update({
            "search_id": search_id,
            "service": "python-langgraph-service",
            "timestamp": datetime.utcnow().isoformat(),
            "type": "pdb_search"
        })
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("PDB search failed", search_id=search_id, error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"PDB search failed: {str(e)}"
        )


@router.post("/small-molecule-analysis")
async def analyze_small_molecule(request: SmallMoleculeRequest):
    """
    Analyze small molecule compound.
    New capability - adds drug-likeness analysis and molecular descriptors.
    """
    analysis_id = str(uuid.uuid4())
    
    logger.info("Small molecule analysis requested",
               analysis_id=analysis_id,
               compound=request.compound_name,
               format=request.data_format)
    
    try:
        result = await small_molecule_analyzer.analyze_compound(
            compound_data=request.compound_data,
            data_format=request.data_format,
            compound_name=request.compound_name
        )
        
        # Add metadata
        result.update({
            "analysis_id": analysis_id,
            "service": "python-langgraph-service",
            "timestamp": datetime.utcnow().isoformat(),
            "type": "small_molecule_analysis"
        })
        
        return result
        
    except Exception as e:
        logger.error("Small molecule analysis failed", 
                    analysis_id=analysis_id, error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Small molecule analysis failed: {str(e)}"
        )


@router.post("/structure-comparison")
async def compare_structures(request: StructureComparisonRequest):
    """
    Compare two protein structures.
    New capability - provides structural alignment and similarity analysis.
    """
    comparison_id = str(uuid.uuid4())
    
    logger.info("Structure comparison requested",
               comparison_id=comparison_id,
               struct1=request.structure1_id,
               struct2=request.structure2_id)
    
    try:
        result = await structure_comparator.compare_structures(
            structure1_data=request.structure1_data,
            structure2_data=request.structure2_data,
            structure1_id=request.structure1_id,
            structure2_id=request.structure2_id,
            alignment_method=request.alignment_method
        )
        
        # Add metadata
        result.update({
            "comparison_id": comparison_id,
            "service": "python-langgraph-service",
            "timestamp": datetime.utcnow().isoformat(),
            "type": "structure_comparison"
        })
        
        return result
        
    except Exception as e:
        logger.error("Structure comparison failed",
                    comparison_id=comparison_id, error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Structure comparison failed: {str(e)}"
        )


@router.post("/download-pdb/{pdb_id}")
async def download_pdb_structure(pdb_id: str):
    """
    Download PDB structure file.
    Utility endpoint for getting structure data.
    """
    download_id = str(uuid.uuid4())
    
    logger.info("PDB download requested", 
               download_id=download_id, pdb_id=pdb_id)
    
    try:
        async with PDBSearchEngine() as pdb_search:
            result = await pdb_search.download_structure(pdb_id)
        
        # Add metadata
        result.update({
            "download_id": download_id,
            "service": "python-langgraph-service",
            "timestamp": datetime.utcnow().isoformat(),
            "type": "pdb_download"
        })
        
        return result
        
    except Exception as e:
        logger.error("PDB download failed", 
                    download_id=download_id, pdb_id=pdb_id, error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"PDB download failed: {str(e)}"
        )


@router.get("/analysis-capabilities")
async def get_analysis_capabilities():
    """
    Get information about available analysis capabilities.
    Useful for frontend to understand what analysis options are available.
    """
    return {
        "service": "python-langgraph-service",
        "version": "0.1.0",
        "capabilities": {
            "molecular_analysis": {
                "description": "Protein structure analysis using BioPython",
                "methods": ["basic", "comprehensive", "custom"],
                "features": [
                    "Basic structural properties",
                    "Secondary structure analysis",
                    "Hydrogen bond analysis",
                    "Hydrophobic contacts",
                    "Sequence analysis",
                    "Binding site prediction"
                ]
            },
            "pdb_search": {
                "description": "Real-time PDB database search",
                "search_types": ["id", "keyword", "organism", "resolution"],
                "features": [
                    "Structure metadata retrieval",
                    "Filtered searches",
                    "Structure file download",
                    "Organism filtering",
                    "Resolution filtering"
                ]
            },
            "small_molecule_analysis": {
                "description": "Small molecule property analysis",
                "supported_formats": ["smiles"],
                "features": [
                    "Molecular descriptors",
                    "Lipinski's Rule of Five",
                    "Drug-likeness assessment",
                    "Property comparison"
                ]
            },
            "structure_comparison": {
                "description": "Protein structure alignment and comparison",
                "alignment_methods": ["ca_atoms", "backbone", "all_atoms"],
                "features": [
                    "Structural superposition",
                    "RMSD calculation",
                    "Sequence alignment",
                    "Similarity metrics",
                    "Binding site comparison"
                ]
            }
        },
        "scientific_libraries": {
            "biopython": "1.81+",
            "numpy": "1.24+",
            "scipy": "1.11+"
        }
    }


@router.get("/")
async def molecular_analysis_root():
    """Molecular analysis API root endpoint."""
    return {
        "message": "Python LangGraph Molecular Analysis API",
        "version": "0.1.0",
        "endpoints": [
            "/molecular-analysis - Analyze protein structures",
            "/pdb-search - Search PDB database", 
            "/small-molecule-analysis - Analyze small molecules",
            "/structure-comparison - Compare protein structures",
            "/download-pdb/{pdb_id} - Download PDB structure",
            "/analysis-capabilities - Get available capabilities"
        ],
        "status": "operational"
    }