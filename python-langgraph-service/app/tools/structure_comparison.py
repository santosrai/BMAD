"""
Protein structure comparison and alignment tools using BioPython.
"""

from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from datetime import datetime

import structlog
from Bio.PDB import PDBParser, Superimposer, PDBIO, Selection
from Bio.PDB.Structure import Structure
from Bio.PDB.Atom import Atom
from Bio.PDB.Residue import Residue
from Bio.SeqUtils import seq1
from Bio.pairwise2 import align
import tempfile
from pathlib import Path

logger = structlog.get_logger(__name__)


class StructureComparator:
    """Protein structure comparison and alignment."""
    
    def __init__(self):
        self.pdb_parser = PDBParser(QUIET=True)
        self.superimposer = Superimposer()
    
    async def compare_structures(
        self,
        structure1_data: str,
        structure2_data: str,
        structure1_id: str = "structure_1",
        structure2_id: str = "structure_2",
        alignment_method: str = "ca_atoms"
    ) -> Dict[str, Any]:
        """
        Compare two protein structures.
        
        Args:
            structure1_data: PDB data for first structure
            structure2_data: PDB data for second structure  
            structure1_id: ID for first structure
            structure2_id: ID for second structure
            alignment_method: Method for alignment ('ca_atoms', 'backbone', 'all_atoms')
            
        Returns:
            Dictionary with comparison results
        """
        logger.info("Starting structure comparison", 
                   struct1=structure1_id, struct2=structure2_id, method=alignment_method)
        
        try:
            # Parse structures
            structure1 = self._parse_structure(structure1_data, structure1_id)
            structure2 = self._parse_structure(structure2_data, structure2_id)
            
            result = {
                "structure1_id": structure1_id,
                "structure2_id": structure2_id,
                "alignment_method": alignment_method,
                "timestamp": datetime.utcnow().isoformat(),
                "status": "success",
                "structural_alignment": {},
                "sequence_alignment": {},
                "similarity_metrics": {},
                "binding_site_comparison": {}
            }
            
            # Perform structural alignment
            structural_results = await self._perform_structural_alignment(
                structure1, structure2, alignment_method
            )
            result["structural_alignment"] = structural_results
            
            # Perform sequence alignment
            sequence_results = await self._perform_sequence_alignment(structure1, structure2)
            result["sequence_alignment"] = sequence_results
            
            # Calculate similarity metrics
            similarity_metrics = await self._calculate_similarity_metrics(
                structure1, structure2, structural_results, sequence_results
            )
            result["similarity_metrics"] = similarity_metrics
            
            # Compare binding sites
            binding_comparison = await self._compare_binding_sites(structure1, structure2)
            result["binding_site_comparison"] = binding_comparison
            
            logger.info("Structure comparison completed", 
                       struct1=structure1_id, struct2=structure2_id,
                       rmsd=structural_results.get("rmsd"))
            
            return result
            
        except Exception as e:
            logger.error("Structure comparison failed", error=str(e))
            return {
                "structure1_id": structure1_id,
                "structure2_id": structure2_id,
                "status": "error",
                "error": str(e)
            }
    
    def _parse_structure(self, structure_data: str, structure_id: str) -> Structure:
        """Parse PDB structure from string data."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.pdb', delete=False) as temp_file:
            temp_file.write(structure_data)
            temp_path = temp_file.name
        
        try:
            structure = self.pdb_parser.get_structure(structure_id, temp_path)
            return structure
        finally:
            Path(temp_path).unlink(missing_ok=True)
    
    async def _perform_structural_alignment(
        self, 
        structure1: Structure, 
        structure2: Structure,
        method: str
    ) -> Dict[str, Any]:
        """Perform structural alignment between two structures."""
        logger.info("Performing structural alignment", method=method)
        
        try:
            # Get atoms for alignment based on method
            atoms1, atoms2 = self._get_alignment_atoms(structure1, structure2, method)
            
            if len(atoms1) == 0 or len(atoms2) == 0:
                return {
                    "status": "failed",
                    "error": "No suitable atoms found for alignment",
                    "method": method
                }
            
            # Ensure same number of atoms
            min_atoms = min(len(atoms1), len(atoms2))
            atoms1 = atoms1[:min_atoms]
            atoms2 = atoms2[:min_atoms]
            
            # Perform superposition
            self.superimposer.set_atoms(atoms1, atoms2)
            
            # Get alignment results
            rmsd = self.superimposer.rms
            rotation_matrix = self.superimposer.rotran[0]
            translation_vector = self.superimposer.rotran[1]
            
            # Calculate additional metrics
            transformation_matrix = np.eye(4)
            transformation_matrix[:3, :3] = rotation_matrix
            transformation_matrix[:3, 3] = translation_vector
            
            result = {
                "status": "success",
                "method": method,
                "rmsd": round(float(rmsd), 3),
                "aligned_atoms": min_atoms,
                "rotation_matrix": rotation_matrix.tolist(),
                "translation_vector": translation_vector.tolist(),
                "transformation_matrix": transformation_matrix.tolist(),
                "alignment_quality": self._assess_alignment_quality(rmsd, min_atoms)
            }
            
            return result
            
        except Exception as e:
            logger.error("Structural alignment failed", error=str(e), method=method)
            return {
                "status": "failed",
                "error": str(e),
                "method": method
            }
    
    def _get_alignment_atoms(
        self, 
        structure1: Structure, 
        structure2: Structure, 
        method: str
    ) -> Tuple[List[Atom], List[Atom]]:
        """Get atoms for structural alignment based on method."""
        atoms1, atoms2 = [], []
        
        try:
            if method == "ca_atoms":
                # Use only C-alpha atoms
                for model in structure1:
                    for chain in model:
                        for residue in chain:
                            if "CA" in residue:
                                atoms1.append(residue["CA"])
                
                for model in structure2:
                    for chain in model:
                        for residue in chain:
                            if "CA" in residue:
                                atoms2.append(residue["CA"])
            
            elif method == "backbone":
                # Use backbone atoms (N, CA, C, O)
                backbone_atoms = ["N", "CA", "C", "O"]
                
                for model in structure1:
                    for chain in model:
                        for residue in chain:
                            for atom_name in backbone_atoms:
                                if atom_name in residue:
                                    atoms1.append(residue[atom_name])
                
                for model in structure2:
                    for chain in model:
                        for residue in chain:
                            for atom_name in backbone_atoms:
                                if atom_name in residue:
                                    atoms2.append(residue[atom_name])
            
            elif method == "all_atoms":
                # Use all atoms
                atoms1 = list(structure1.get_atoms())
                atoms2 = list(structure2.get_atoms())
            
        except Exception as e:
            logger.warning("Failed to extract alignment atoms", error=str(e), method=method)
        
        return atoms1, atoms2
    
    def _assess_alignment_quality(self, rmsd: float, num_atoms: int) -> Dict[str, Any]:
        """Assess the quality of structural alignment."""
        quality = {
            "rmsd_category": "",
            "overall_quality": "",
            "confidence": 0.0
        }
        
        # Categorize RMSD
        if rmsd < 1.0:
            quality["rmsd_category"] = "excellent"
        elif rmsd < 2.0:
            quality["rmsd_category"] = "very_good"
        elif rmsd < 3.0:
            quality["rmsd_category"] = "good"
        elif rmsd < 5.0:
            quality["rmsd_category"] = "moderate"
        else:
            quality["rmsd_category"] = "poor"
        
        # Overall quality assessment
        if rmsd < 1.5 and num_atoms > 50:
            quality["overall_quality"] = "high"
            quality["confidence"] = 0.9
        elif rmsd < 3.0 and num_atoms > 30:
            quality["overall_quality"] = "medium"
            quality["confidence"] = 0.7
        else:
            quality["overall_quality"] = "low"
            quality["confidence"] = 0.4
        
        return quality
    
    async def _perform_sequence_alignment(
        self, 
        structure1: Structure, 
        structure2: Structure
    ) -> Dict[str, Any]:
        """Perform sequence alignment between structures."""
        logger.info("Performing sequence alignment")
        
        try:
            # Extract sequences from structures
            sequences1 = self._extract_sequences(structure1)
            sequences2 = self._extract_sequences(structure2)
            
            if not sequences1 or not sequences2:
                return {
                    "status": "failed",
                    "error": "Could not extract sequences from structures"
                }
            
            # Align sequences (using first chain of each structure)
            seq1_str = sequences1[0]["sequence"]
            seq2_str = sequences2[0]["sequence"]
            
            # Perform pairwise sequence alignment
            alignments = align.globalxx(seq1_str, seq2_str)
            
            if alignments:
                best_alignment = alignments[0]
                aligned_seq1, aligned_seq2, score, begin, end = best_alignment
                
                # Calculate sequence identity
                matches = sum(1 for a, b in zip(aligned_seq1, aligned_seq2) if a == b and a != '-')
                total_aligned = len(aligned_seq1)
                identity = (matches / total_aligned) * 100 if total_aligned > 0 else 0
                
                # Calculate sequence similarity (including conservative substitutions)
                similar_pairs = {
                    ('A', 'G'), ('A', 'S'), ('A', 'T'), ('D', 'E'), ('D', 'N'),
                    ('F', 'Y'), ('F', 'W'), ('H', 'K'), ('H', 'R'), ('I', 'L'),
                    ('I', 'M'), ('I', 'V'), ('K', 'R'), ('L', 'M'), ('N', 'Q'),
                    ('N', 'S'), ('Q', 'E'), ('S', 'T'), ('V', 'L')
                }
                
                similarities = matches  # Start with identical matches
                for a, b in zip(aligned_seq1, aligned_seq2):
                    if a != b and a != '-' and b != '-':
                        if (a, b) in similar_pairs or (b, a) in similar_pairs:
                            similarities += 1
                
                similarity = (similarities / total_aligned) * 100 if total_aligned > 0 else 0
                
                return {
                    "status": "success",
                    "sequence1": {
                        "chain_id": sequences1[0]["chain_id"],
                        "length": len(seq1_str),
                        "sequence": seq1_str[:50] + "..." if len(seq1_str) > 50 else seq1_str
                    },
                    "sequence2": {
                        "chain_id": sequences2[0]["chain_id"],
                        "length": len(seq2_str),
                        "sequence": seq2_str[:50] + "..." if len(seq2_str) > 50 else seq2_str
                    },
                    "alignment": {
                        "aligned_seq1": aligned_seq1[:100] + "..." if len(aligned_seq1) > 100 else aligned_seq1,
                        "aligned_seq2": aligned_seq2[:100] + "..." if len(aligned_seq2) > 100 else aligned_seq2,
                        "alignment_length": total_aligned,
                        "identical_residues": matches,
                        "sequence_identity": round(identity, 2),
                        "sequence_similarity": round(similarity, 2),
                        "alignment_score": round(float(score), 2)
                    }
                }
            
            return {
                "status": "failed",
                "error": "No sequence alignment found"
            }
            
        except Exception as e:
            logger.error("Sequence alignment failed", error=str(e))
            return {
                "status": "failed",
                "error": str(e)
            }
    
    def _extract_sequences(self, structure: Structure) -> List[Dict[str, Any]]:
        """Extract amino acid sequences from structure."""
        sequences = []
        
        try:
            for model in structure:
                for chain in model:
                    residues = []
                    for residue in chain:
                        if residue.get_id()[0] == ' ':  # Only standard residues
                            res_name = residue.get_resname()
                            try:
                                single_letter = seq1(res_name)
                                residues.append(single_letter)
                            except KeyError:
                                residues.append('X')  # Unknown residue
                    
                    if residues:
                        sequences.append({
                            "chain_id": chain.id,
                            "sequence": ''.join(residues)
                        })
        
        except Exception as e:
            logger.warning("Sequence extraction failed", error=str(e))
        
        return sequences
    
    async def _calculate_similarity_metrics(
        self,
        structure1: Structure,
        structure2: Structure,
        structural_results: Dict[str, Any],
        sequence_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate overall similarity metrics."""
        try:
            metrics = {
                "structural_similarity": 0.0,
                "sequence_similarity": 0.0,
                "overall_similarity": 0.0,
                "similarity_category": ""
            }
            
            # Structural similarity (based on RMSD)
            rmsd = structural_results.get("rmsd", float('inf'))
            if rmsd < 1.0:
                structural_sim = 95.0
            elif rmsd < 2.0:
                structural_sim = 85.0
            elif rmsd < 3.0:
                structural_sim = 70.0
            elif rmsd < 5.0:
                structural_sim = 50.0
            else:
                structural_sim = max(0, 100 - rmsd * 10)
            
            metrics["structural_similarity"] = round(structural_sim, 1)
            
            # Sequence similarity
            seq_sim = sequence_results.get("alignment", {}).get("sequence_similarity", 0.0)
            metrics["sequence_similarity"] = seq_sim
            
            # Overall similarity (weighted average)
            overall = (structural_sim * 0.6 + seq_sim * 0.4)  # Weight structure more heavily
            metrics["overall_similarity"] = round(overall, 1)
            
            # Categorize similarity
            if overall >= 80:
                metrics["similarity_category"] = "very_similar"
            elif overall >= 60:
                metrics["similarity_category"] = "similar"
            elif overall >= 40:
                metrics["similarity_category"] = "moderately_similar"
            elif overall >= 20:
                metrics["similarity_category"] = "distantly_similar"
            else:
                metrics["similarity_category"] = "dissimilar"
            
            return metrics
            
        except Exception as e:
            logger.warning("Similarity calculation failed", error=str(e))
            return {"error": str(e)}
    
    async def _compare_binding_sites(
        self, 
        structure1: Structure, 
        structure2: Structure
    ) -> Dict[str, Any]:
        """Compare potential binding sites between structures."""
        try:
            comparison = {
                "status": "success",
                "binding_sites1": [],
                "binding_sites2": [],
                "common_features": [],
                "differences": []
            }
            
            # This is a simplified binding site analysis
            # In practice, you'd use more sophisticated algorithms
            
            # Find potential binding sites (cavities with hydrophobic residues nearby)
            sites1 = self._find_potential_binding_sites(structure1)
            sites2 = self._find_potential_binding_sites(structure2)
            
            comparison["binding_sites1"] = sites1
            comparison["binding_sites2"] = sites2
            
            # Compare features
            if sites1 and sites2:
                comparison["common_features"].append("Both structures have potential binding sites")
                
                # Simple comparison of site counts and properties
                if len(sites1) == len(sites2):
                    comparison["common_features"].append("Similar number of binding sites")
                else:
                    comparison["differences"].append(f"Different number of sites: {len(sites1)} vs {len(sites2)}")
            
            return comparison
            
        except Exception as e:
            logger.warning("Binding site comparison failed", error=str(e))
            return {
                "status": "failed",
                "error": str(e)
            }
    
    def _find_potential_binding_sites(self, structure: Structure) -> List[Dict[str, Any]]:
        """Find potential binding sites in structure (simplified)."""
        sites = []
        
        try:
            hydrophobic_residues = {'ALA', 'VAL', 'LEU', 'ILE', 'MET', 'PHE', 'TRP', 'PRO'}
            
            for model in structure:
                for chain in model:
                    hydrophobic_clusters = []
                    hydrophobic_residues_in_chain = []
                    
                    for residue in chain:
                        if residue.get_resname() in hydrophobic_residues:
                            hydrophobic_residues_in_chain.append(residue)
                    
                    # Simple clustering - residues close to each other
                    for i, res1 in enumerate(hydrophobic_residues_in_chain):
                        cluster = [res1]
                        for res2 in hydrophobic_residues_in_chain[i+1:]:
                            if res1['CA'] - res2['CA'] < 10.0:  # Within 10 Angstroms
                                cluster.append(res2)
                        
                        if len(cluster) >= 3:  # At least 3 hydrophobic residues
                            # Calculate center of cluster
                            coords = [res['CA'].get_coord() for res in cluster if 'CA' in res]
                            if coords:
                                center = np.mean(coords, axis=0)
                                sites.append({
                                    "chain": chain.id,
                                    "residue_count": len(cluster),
                                    "center": center.tolist(),
                                    "type": "hydrophobic_cluster"
                                })
        
        except Exception as e:
            logger.warning("Binding site detection failed", error=str(e))
        
        return sites