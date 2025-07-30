"""
MolecularAnalysisAgent for BioPython-based structural analysis.
Handles protein structure analysis, sequence analysis, and molecular properties.
"""

from typing import Dict, Any, Optional
from datetime import datetime

import structlog
from langchain_core.messages import HumanMessage, AIMessage

from .base_agent import BaseAgent, AgentType, AgentState, agent_registry
from ..tools.molecular_analysis import MolecularAnalyzer

logger = structlog.get_logger(__name__)


class MolecularAnalysisAgent(BaseAgent):
    """
    Agent responsible for molecular structure analysis using BioPython.
    Handles protein analysis, sequence analysis, and structural properties.
    """
    
    def __init__(
        self,
        agent_id: str = "molecular_analysis_agent",
        config: Optional[Dict[str, Any]] = None
    ):
        super().__init__(agent_id, AgentType.MOLECULAR_ANALYSIS, config)
        self.analyzer = MolecularAnalyzer()
    
    def can_handle(self, state: AgentState) -> bool:
        """Check if this agent can handle the current state."""
        # Check for molecular analysis requests
        if state.workflow_type == "molecular_analysis_workflow":
            return True
        
        # Check for structure data in context
        if state.molecular_data.get("structure_data") or state.molecular_data.get("pdb_data"):
            return True
        
        # Check for analysis keywords in messages
        if state.messages:
            last_message = state.messages[-1]
            if isinstance(last_message, HumanMessage):
                message_content = last_message.content.lower()
                analysis_keywords = [
                    "analyze", "analysis", "structure", "binding", "active site",
                    "secondary structure", "hydrogen bonds", "molecular weight",
                    "sequence", "protein properties", "hydrophobic", "cavity"
                ]
                if any(keyword in message_content for keyword in analysis_keywords):
                    return True
        
        # Check for analysis intent in context
        intent_analysis = state.context.get("intent_analysis", {})
        if intent_analysis.get("primary_intent") == "analysis_request":
            return True
        
        return False
    
    async def execute(self, state: AgentState) -> Dict[str, Any]:
        """Execute molecular analysis."""
        await self.pre_execute(state)
        
        try:
            # Determine analysis type and parameters
            analysis_config = self._prepare_analysis_config(state)
            
            # Perform molecular analysis
            analysis_results = await self._perform_analysis(analysis_config, state)
            
            # Generate human-readable summary
            summary = self._generate_analysis_summary(analysis_results)
            
            # Create result message
            result_message = AIMessage(
                content=f"Molecular analysis completed. {summary['description']}"
            )
            
            result = {
                **state.dict(),
                "messages": state.messages + [result_message],
                "current_agent": self.agent_id,
                "analysis_results": {
                    **state.analysis_results,
                    self.agent_id: analysis_results
                },
                "molecular_data": {
                    **state.molecular_data,
                    "latest_analysis": analysis_results,
                    "analysis_summary": summary
                },
                "completed_at": datetime.utcnow(),
                "next_agent": self._determine_next_agent(analysis_results, state)
            }
            
            await self.post_execute(state, result)
            return result
            
        except Exception as e:
            error_msg = f"Molecular analysis failed: {str(e)}"
            self.logger.error("Molecular analysis execution failed", error=str(e))
            
            result = {
                **state.dict(),
                "error_state": error_msg,
                "current_agent": self.agent_id,
                "messages": state.messages + [AIMessage(content=f"Analysis failed: {str(e)}")]
            }
            
            await self.post_execute(state, result)
            return result
    
    def _prepare_analysis_config(self, state: AgentState) -> Dict[str, Any]:
        """Prepare analysis configuration from state."""
        config = {
            "analysis_type": "comprehensive",  # Default
            "structure_data": None,
            "structure_id": "unknown",
            "requested_analyses": []
        }
        
        # Get structure data from various sources
        if state.molecular_data.get("structure_data"):
            config["structure_data"] = state.molecular_data["structure_data"]
            config["structure_id"] = state.molecular_data.get("structure_id", "from_state")
        elif state.molecular_data.get("pdb_data"):
            config["structure_data"] = state.molecular_data["pdb_data"]
            config["structure_id"] = state.molecular_data.get("pdb_id", "from_pdb")
        elif state.parameters.get("structure_data"):
            config["structure_data"] = state.parameters["structure_data"]
            config["structure_id"] = state.parameters.get("structure_id", "from_params")
        
        # Determine analysis type from context
        if state.parameters.get("analysis_type"):
            config["analysis_type"] = state.parameters["analysis_type"]
        elif state.context.get("analysis_request"):
            # Parse specific analysis requests
            requested = state.context["analysis_request"]
            if "basic" in requested:
                config["analysis_type"] = "basic"
            elif "comprehensive" in requested:
                config["analysis_type"] = "comprehensive"
        
        # Extract specific analysis requests from messages
        if state.messages:
            last_message = state.messages[-1]
            if isinstance(last_message, HumanMessage):
                message_content = last_message.content.lower()
                
                analysis_mapping = {
                    "secondary structure": "secondary_structure",
                    "hydrogen bond": "hydrogen_bonds",
                    "binding site": "binding_sites",
                    "hydrophobic": "hydrophobic_contacts",
                    "sequence": "sequence_analysis",
                    "molecular weight": "molecular_properties"
                }
                
                for keyword, analysis_type in analysis_mapping.items():
                    if keyword in message_content:
                        config["requested_analyses"].append(analysis_type)
        
        return config
    
    async def _perform_analysis(self, config: Dict[str, Any], state: AgentState) -> Dict[str, Any]:
        """Perform the actual molecular analysis."""
        if not config["structure_data"]:
            # Try to get structure from search results
            search_results = state.search_results
            if search_results and "pdb_data" in search_results:
                config["structure_data"] = search_results["pdb_data"]
                config["structure_id"] = search_results.get("pdb_id", "from_search")
            else:
                raise ValueError("No structure data available for analysis")
        
        self.logger.info(
            "Starting molecular analysis",
            structure_id=config["structure_id"],
            analysis_type=config["analysis_type"]
        )
        
        # Perform analysis using existing molecular analyzer
        result = await self.analyzer.analyze_structure(
            structure_data=config["structure_data"],
            structure_id=config["structure_id"],
            analysis_type=config["analysis_type"]
        )
        
        # Add metadata
        result["agent_metadata"] = {
            "agent_id": self.agent_id,
            "analysis_config": config,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return result
    
    def _generate_analysis_summary(self, analysis_results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate human-readable summary of analysis results."""
        if analysis_results.get("status") == "failed":
            return {
                "description": f"Analysis failed: {analysis_results.get('error', 'Unknown error')}",
                "key_findings": [],
                "recommendations": ["Please check the structure data and try again."]
            }
        
        summary = {
            "description": "Molecular analysis completed successfully.",
            "key_findings": [],
            "recommendations": []
        }
        
        # Basic properties summary
        if "basic_properties" in analysis_results:
            props = analysis_results["basic_properties"]
            summary["key_findings"].append(
                f"Structure contains {props.get('chain_count', 0)} chains with "
                f"{props.get('total_residues', 0)} residues and {props.get('total_atoms', 0)} atoms."
            )
            
            if "dimensions" in props:
                dims = props["dimensions"]
                summary["key_findings"].append(
                    f"Structure dimensions: {dims.get('x', 0):.1f} × "
                    f"{dims.get('y', 0):.1f} × {dims.get('z', 0):.1f} Å"
                )
        
        # Secondary structure summary
        if "secondary_structure" in analysis_results:
            ss = analysis_results["secondary_structure"]
            for chain_id, chain_ss in ss.get("chains", {}).items():
                total_residues = (
                    chain_ss.get("alpha_helix", 0) +
                    chain_ss.get("beta_sheet", 0) +
                    chain_ss.get("coil", 0)
                )
                if total_residues > 0:
                    helix_pct = (chain_ss.get("alpha_helix", 0) / total_residues) * 100
                    sheet_pct = (chain_ss.get("beta_sheet", 0) / total_residues) * 100
                    summary["key_findings"].append(
                        f"Chain {chain_id}: {helix_pct:.1f}% α-helix, {sheet_pct:.1f}% β-sheet"
                    )
        
        # Hydrogen bonds summary  
        if "hydrogen_bonds" in analysis_results:
            h_bonds = analysis_results["hydrogen_bonds"]
            bond_count = h_bonds.get("total_potential_bonds", 0)
            summary["key_findings"].append(f"Found {bond_count} potential hydrogen bonds")
        
        # Sequence analysis summary
        if "sequence_analysis" in analysis_results:
            seq_data = analysis_results["sequence_analysis"]
            for chain_id, seq_info in seq_data.items():
                if "molecular_weight" in seq_info:
                    summary["key_findings"].append(
                        f"Chain {chain_id}: {seq_info.get('length', 0)} residues, "
                        f"{seq_info.get('molecular_weight', 0):.1f} Da"
                    )
        
        # Binding sites summary
        if "binding_sites" in analysis_results:
            sites = analysis_results["binding_sites"].get("predicted_sites", [])
            if sites:
                summary["key_findings"].append(f"Identified {len(sites)} potential binding sites")
                summary["recommendations"].append("Consider further validation of predicted binding sites")
        
        # Add general recommendations
        if analysis_results.get("analysis_type") == "basic":
            summary["recommendations"].append("Run comprehensive analysis for detailed insights")
        
        return summary
    
    def _determine_next_agent(self, analysis_results: Dict[str, Any], state: AgentState) -> Optional[str]:
        """Determine if analysis should be passed to another agent."""
        # If analysis found binding sites, might want visualization
        if analysis_results.get("binding_sites", {}).get("predicted_sites"):
            return "visualization_agent"
        
        # If this was part of a larger workflow, return to orchestration
        if state.context.get("orchestrated_workflow"):
            return "orchestration_agent"
        
        # For structure comparison, could route to comparison agent
        if state.context.get("comparison_request"):
            return "structure_comparison_agent"
        
        return None


# Register the molecular analysis agent globally
molecular_analysis_agent = MolecularAnalysisAgent()
agent_registry.register_agent(molecular_analysis_agent)