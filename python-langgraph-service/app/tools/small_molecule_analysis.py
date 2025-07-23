"""
Small molecule analysis tools.
Note: This is a simplified implementation. RDKit will be added later for full functionality.
"""

import re
from typing import Dict, Any, List, Optional
from datetime import datetime

import structlog

logger = structlog.get_logger(__name__)


class SimpleMolecularDescriptors:
    """Simple molecular descriptors without RDKit dependency."""
    
    def __init__(self):
        # Atomic weights for common elements
        self.atomic_weights = {
            'H': 1.008, 'C': 12.011, 'N': 14.007, 'O': 15.999,
            'F': 18.998, 'P': 30.974, 'S': 32.065, 'Cl': 35.453,
            'Br': 79.904, 'I': 126.904
        }
        
        # Lipinski's Rule of Five reference values
        self.lipinski_mw_max = 500
        self.lipinski_logp_max = 5
        self.lipinski_hbd_max = 5
        self.lipinski_hba_max = 10
    
    def analyze_smiles(self, smiles: str, compound_name: str = "unknown") -> Dict[str, Any]:
        """
        Analyze a SMILES string for basic molecular properties.
        
        Args:
            smiles: SMILES string representation
            compound_name: Name/identifier for the compound
            
        Returns:
            Dictionary with molecular analysis results
        """
        logger.info("Analyzing SMILES", compound=compound_name, smiles=smiles[:50])
        
        try:
            result = {
                "compound_name": compound_name,
                "smiles": smiles,
                "status": "success",
                "analysis_type": "basic_descriptors",
                "timestamp": datetime.utcnow().isoformat(),
                "properties": {},
                "lipinski_analysis": {},
                "warnings": []
            }
            
            # Calculate basic properties
            properties = self._calculate_basic_properties(smiles)
            result["properties"] = properties
            
            # Lipinski's Rule of Five analysis
            lipinski = self._analyze_lipinski_rule(properties)
            result["lipinski_analysis"] = lipinski
            
            # Drug-likeness assessment
            drug_likeness = self._assess_drug_likeness(properties, lipinski)
            result["drug_likeness"] = drug_likeness
            
            logger.info("SMILES analysis completed", compound=compound_name)
            return result
            
        except Exception as e:
            logger.error("SMILES analysis failed", compound=compound_name, error=str(e))
            return {
                "compound_name": compound_name,
                "smiles": smiles,
                "status": "error",
                "error": str(e)
            }
    
    def _calculate_basic_properties(self, smiles: str) -> Dict[str, Any]:
        """Calculate basic molecular properties from SMILES."""
        properties = {
            "molecular_formula": "",
            "molecular_weight": 0.0,
            "atom_count": 0,
            "bond_count": 0,
            "ring_count": 0,
            "hydrogen_bond_donors": 0,
            "hydrogen_bond_acceptors": 0,
            "rotatable_bonds": 0,
            "aromatic_rings": 0
        }
        
        try:
            # Count atoms (simplified approach)
            atom_counts = {}
            
            # Remove brackets and extract atoms
            cleaned_smiles = re.sub(r'\[|\]|\(|\)|\+|\-|=|#|@', '', smiles)
            
            # Count each element
            element_pattern = r'[A-Z][a-z]?'
            elements = re.findall(element_pattern, cleaned_smiles)
            
            for element in elements:
                atom_counts[element] = atom_counts.get(element, 0) + 1
            
            # Calculate molecular weight
            molecular_weight = 0.0
            formula_parts = []
            
            for element, count in atom_counts.items():
                if element in self.atomic_weights:
                    molecular_weight += self.atomic_weights[element] * count
                    if count == 1:
                        formula_parts.append(element)
                    else:
                        formula_parts.append(f"{element}{count}")
            
            properties["molecular_formula"] = "".join(sorted(formula_parts))
            properties["molecular_weight"] = round(molecular_weight, 2)
            properties["atom_count"] = sum(atom_counts.values())
            
            # Count rings (simplified - count ring closure digits)
            ring_closures = re.findall(r'\d', smiles)
            properties["ring_count"] = len(set(ring_closures)) // 2  # Each ring closure appears twice
            
            # Count aromatic rings (lowercase letters in SMILES often indicate aromaticity)
            aromatic_pattern = r'[a-z]'
            aromatic_atoms = len(re.findall(aromatic_pattern, smiles))
            properties["aromatic_rings"] = max(0, aromatic_atoms // 6)  # Rough estimate
            
            # Hydrogen bond donors (N-H, O-H groups)
            nh_count = smiles.count('N') - smiles.count('[N')  # Crude approximation
            oh_count = smiles.count('O') - smiles.count('C=O') - smiles.count('S=O')  # Crude approximation
            properties["hydrogen_bond_donors"] = max(0, nh_count + oh_count)
            
            # Hydrogen bond acceptors (N, O atoms)
            properties["hydrogen_bond_acceptors"] = atom_counts.get('N', 0) + atom_counts.get('O', 0)
            
            # Rotatable bonds (single bonds not in rings - very simplified)
            single_bonds = smiles.count('-') + smiles.count('C') - properties["ring_count"] * 3
            properties["rotatable_bonds"] = max(0, single_bonds - properties["ring_count"] * 2)
            
            # Bond count estimation
            properties["bond_count"] = properties["atom_count"] - 1 + properties["ring_count"]
            
        except Exception as e:
            logger.warning("Property calculation failed", error=str(e))
            
        return properties
    
    def _analyze_lipinski_rule(self, properties: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze compliance with Lipinski's Rule of Five."""
        lipinski = {
            "molecular_weight": {
                "value": properties.get("molecular_weight", 0),
                "threshold": self.lipinski_mw_max,
                "passes": properties.get("molecular_weight", 0) <= self.lipinski_mw_max
            },
            "hydrogen_bond_donors": {
                "value": properties.get("hydrogen_bond_donors", 0),
                "threshold": self.lipinski_hbd_max,
                "passes": properties.get("hydrogen_bond_donors", 0) <= self.lipinski_hbd_max
            },
            "hydrogen_bond_acceptors": {
                "value": properties.get("hydrogen_bond_acceptors", 0),
                "threshold": self.lipinski_hba_max,
                "passes": properties.get("hydrogen_bond_acceptors", 0) <= self.lipinski_hba_max
            }
        }
        
        # Count violations
        violations = sum(1 for rule in lipinski.values() if not rule["passes"])
        
        lipinski["total_violations"] = violations
        lipinski["passes_rule_of_five"] = violations <= 1  # Allow one violation
        lipinski["compliance_percentage"] = ((len(lipinski) - 1 - violations) / (len(lipinski) - 1)) * 100
        
        return lipinski
    
    def _assess_drug_likeness(self, properties: Dict[str, Any], lipinski: Dict[str, Any]) -> Dict[str, Any]:
        """Assess overall drug-likeness."""
        drug_likeness = {
            "overall_score": 0.0,
            "category": "unknown",
            "recommendations": [],
            "flags": []
        }
        
        try:
            score = 0.0
            
            # Lipinski compliance (40% of score)
            if lipinski.get("passes_rule_of_five", False):
                score += 40
            else:
                score += lipinski.get("compliance_percentage", 0) * 0.4
            
            # Molecular complexity (30% of score)
            mw = properties.get("molecular_weight", 0)
            if 150 <= mw <= 450:  # Optimal range
                score += 30
            elif mw < 150:
                score += 15
                drug_likeness["flags"].append("Low molecular weight - may lack potency")
            elif mw > 500:
                score += 10
                drug_likeness["flags"].append("High molecular weight - poor oral bioavailability")
            
            # Structural features (30% of score)
            rings = properties.get("ring_count", 0)
            if 1 <= rings <= 4:  # Optimal ring count
                score += 15
            elif rings == 0:
                drug_likeness["flags"].append("No rings - may lack specificity")
            elif rings > 5:
                drug_likeness["flags"].append("Too many rings - may have poor solubility")
            
            rotatable_bonds = properties.get("rotatable_bonds", 0)
            if rotatable_bonds <= 7:  # Good flexibility
                score += 15
            else:
                score += 5
                drug_likeness["flags"].append("High rotatable bond count - poor oral bioavailability")
            
            drug_likeness["overall_score"] = round(score, 1)
            
            # Categorize drug-likeness
            if score >= 80:
                drug_likeness["category"] = "excellent"
                drug_likeness["recommendations"].append("Compound shows excellent drug-like properties")
            elif score >= 60:
                drug_likeness["category"] = "good"
                drug_likeness["recommendations"].append("Compound has good drug-like properties with minor issues")
            elif score >= 40:
                drug_likeness["category"] = "fair"
                drug_likeness["recommendations"].append("Compound has moderate drug-likeness - consider optimization")
            else:
                drug_likeness["category"] = "poor"
                drug_likeness["recommendations"].append("Compound shows poor drug-likeness - significant optimization needed")
            
            # Add specific recommendations
            if not lipinski.get("passes_rule_of_five", False):
                drug_likeness["recommendations"].append("Consider optimizing for Lipinski's Rule of Five compliance")
            
            if properties.get("aromatic_rings", 0) == 0:
                drug_likeness["recommendations"].append("Consider adding aromatic rings for target binding")
            
        except Exception as e:
            logger.warning("Drug-likeness assessment failed", error=str(e))
            drug_likeness["error"] = str(e)
        
        return drug_likeness


class SmallMoleculeAnalyzer:
    """Small molecule analysis coordinator."""
    
    def __init__(self):
        self.descriptor_calculator = SimpleMolecularDescriptors()
    
    async def analyze_compound(
        self, 
        compound_data: str, 
        data_format: str = "smiles",
        compound_name: str = "unknown"
    ) -> Dict[str, Any]:
        """
        Analyze a small molecule compound.
        
        Args:
            compound_data: Molecular data (SMILES, SDF, etc.)
            data_format: Format of the data ('smiles', 'sdf', 'mol')
            compound_name: Name/identifier for the compound
            
        Returns:
            Dictionary with analysis results
        """
        logger.info("Starting small molecule analysis", 
                   compound=compound_name, format=data_format)
        
        try:
            if data_format.lower() == "smiles":
                return self.descriptor_calculator.analyze_smiles(compound_data, compound_name)
            else:
                return {
                    "compound_name": compound_name,
                    "status": "error",
                    "error": f"Format '{data_format}' not yet supported. Currently supports: smiles"
                }
                
        except Exception as e:
            logger.error("Small molecule analysis failed", error=str(e), compound=compound_name)
            return {
                "compound_name": compound_name,
                "status": "error",
                "error": str(e)
            }
    
    async def compare_compounds(
        self, 
        compound1: str, 
        compound2: str,
        data_format: str = "smiles"
    ) -> Dict[str, Any]:
        """
        Compare two small molecules.
        
        Args:
            compound1: First compound data
            compound2: Second compound data
            data_format: Format of the data
            
        Returns:
            Dictionary with comparison results
        """
        logger.info("Comparing small molecules")
        
        try:
            # Analyze both compounds
            analysis1 = await self.analyze_compound(compound1, data_format, "compound_1")
            analysis2 = await self.analyze_compound(compound2, data_format, "compound_2")
            
            if analysis1["status"] != "success" or analysis2["status"] != "success":
                return {
                    "status": "error",
                    "error": "One or both compound analyses failed",
                    "analysis1": analysis1,
                    "analysis2": analysis2
                }
            
            # Compare properties
            comparison = {
                "status": "success",
                "comparison_type": "property_comparison",
                "compound1": analysis1,
                "compound2": analysis2,
                "differences": {},
                "similarities": {},
                "similarity_score": 0.0
            }
            
            # Calculate property differences
            props1 = analysis1.get("properties", {})
            props2 = analysis2.get("properties", {})
            
            for prop in props1:
                if prop in props2:
                    val1, val2 = props1[prop], props2[prop]
                    if isinstance(val1, (int, float)) and isinstance(val2, (int, float)):
                        diff = abs(val1 - val2)
                        rel_diff = (diff / max(abs(val1), abs(val2), 1)) * 100
                        comparison["differences"][prop] = {
                            "compound1": val1,
                            "compound2": val2,
                            "absolute_difference": diff,
                            "relative_difference_percent": round(rel_diff, 1)
                        }
            
            # Calculate overall similarity score (simplified)
            total_props = len(comparison["differences"])
            if total_props > 0:
                avg_rel_diff = sum(d["relative_difference_percent"] for d in comparison["differences"].values()) / total_props
                comparison["similarity_score"] = round(max(0, 100 - avg_rel_diff), 1)
            
            return comparison
            
        except Exception as e:
            logger.error("Compound comparison failed", error=str(e))
            return {
                "status": "error",
                "error": str(e)
            }