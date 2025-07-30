"""
PDBSearchAgent for Protein Data Bank database operations.
Handles PDB searches, structure retrieval, and metadata extraction.
"""

import re
import time
from typing import Dict, Any, List, Optional
from datetime import datetime

import structlog
from langchain_core.messages import HumanMessage, AIMessage

from .base_agent import BaseAgent, AgentType, AgentState, agent_registry
from ..tools.pdb_search import PDBSearchEngine

logger = structlog.get_logger(__name__)


class PDBSearchAgent(BaseAgent):
    """
    Agent responsible for PDB database searches and structure retrieval.
    Handles PDB ID searches, keyword searches, and structure metadata extraction.
    """
    
    def __init__(
        self,
        agent_id: str = "pdb_search_agent",
        config: Optional[Dict[str, Any]] = None
    ):
        super().__init__(agent_id, AgentType.PDB_SEARCH, config)
        self.search_engine = None
        self.protein_mappings = self._load_protein_mappings()
    
    def _load_protein_mappings(self) -> Dict[str, str]:
        """Load common protein name to PDB ID mappings."""
        return {
            'hemoglobin': '1GZX',
            'insulin': '1MSO',
            'lysozyme': '1LYZ',
            'myoglobin': '1MBO',
            'cytochrome c': '1HRC',
            'collagen': '1CAG',
            'albumin': '1AO6',
            'immunoglobulin': '1IGT',
            'antibody': '1IGT',
            'ferritin': '1FHA',
            'catalase': '1DGH',
            'pepsin': '1PSG',
            'chymotrypsin': '1CHO',
            'trypsin': '1TRN',
            'ribonuclease': '1RNH',
            'carbonic anhydrase': '1CA2',
            'alcohol dehydrogenase': '1ADH',
            'lactate dehydrogenase': '1LDH',
            'pyruvate kinase': '1PKN',
            'glyceraldehyde phosphate dehydrogenase': '1GPD',
            'aldolase': '1ALD',
            'phosphoglycerate kinase': '1PGK',
            'enolase': '1ONE',
            'pyruvate dehydrogenase': '1PDH',
            'citrate synthase': '1CTS',
            'isocitrate dehydrogenase': '1IDH',
            'succinate dehydrogenase': '1NEK',
            'fumarase': '1FUO',
            'malate dehydrogenase': '1MLD',
            'glucose oxidase': '1GOD',
            'peroxidase': '1ATJ',
            'superoxide dismutase': '1SOS',
            'glutathione peroxidase': '1GP1',
            'thioredoxin': '1XOB',
            'calmodulin': '1CLL',
            'actin': '1ATN',
            'myosin': '1MYS',
            'tubulin': '1TUB',
            'keratin': '1I2M'
        }
    
    def can_handle(self, state: AgentState) -> bool:
        """Check if this agent can handle the current state."""
        # Check for PDB search workflow
        if state.workflow_type == "pdb_search_workflow":
            return True
        
        # Check for PDB IDs in messages or parameters
        if self._detect_pdb_requests(state):
            return True
        
        # Check for structure display requests
        if state.messages:
            last_message = state.messages[-1]
            if isinstance(last_message, HumanMessage):
                message_content = last_message.content.lower()
                display_keywords = ["show", "display", "load", "view", "get", "fetch", "find"]
                structure_keywords = ["structure", "protein", "pdb"]
                
                has_display = any(keyword in message_content for keyword in display_keywords)
                has_structure = any(keyword in message_content for keyword in structure_keywords)
                
                if has_display and has_structure:
                    return True
        
        # Check for protein name requests
        if self._detect_protein_names(state):
            return True
        
        return False
    
    async def execute(self, state: AgentState) -> Dict[str, Any]:
        """Execute PDB search operations."""
        await self.pre_execute(state)
        
        try:
            # Initialize search engine
            self.search_engine = PDBSearchEngine()
            
            # Detect and extract search parameters
            search_params = self._extract_search_parameters(state)
            
            # Perform searches
            search_results = await self._perform_searches(search_params, state)
            
            # Process results and create actions
            processed_results = self._process_search_results(search_results, state)
            
            # Generate response message
            response_message = self._generate_response_message(processed_results)
            
            result = {
                **state.dict(),
                "messages": state.messages + [AIMessage(content=response_message["content"])],
                "current_agent": self.agent_id,
                "search_results": {
                    **state.search_results,
                    self.agent_id: processed_results
                },
                "molecular_data": {
                    **state.molecular_data,
                    **self._extract_molecular_data(processed_results)
                },
                "visualization_commands": state.visualization_commands + processed_results.get("actions", []),
                "completed_at": datetime.utcnow(),
                "next_agent": self._determine_next_agent(processed_results, state)
            }
            
            await self.post_execute(state, result)
            return result
            
        except Exception as e:
            error_msg = f"PDB search failed: {str(e)}"
            self.logger.error("PDB search execution failed", error=str(e))
            
            result = {
                **state.dict(),
                "error_state": error_msg,
                "current_agent": self.agent_id,
                "messages": state.messages + [AIMessage(content=f"PDB search failed: {str(e)}")]
            }
            
            await self.post_execute(state, result)
            return result
        
        finally:
            # Clean up search engine
            if self.search_engine:
                await self.search_engine.__aexit__(None, None, None)
    
    def _detect_pdb_requests(self, state: AgentState) -> List[str]:
        """Detect PDB ID requests in state."""
        pdb_ids = []
        
        # Check messages for PDB patterns
        if state.messages:
            last_message = state.messages[-1]
            if isinstance(last_message, HumanMessage):
                pdb_ids.extend(self._extract_pdb_ids(last_message.content))
        
        # Check parameters
        if state.parameters.get("pdb_id"):
            pdb_ids.append(state.parameters["pdb_id"])
        
        if state.parameters.get("query"):
            pdb_ids.extend(self._extract_pdb_ids(state.parameters["query"]))
        
        # Check context for routing decisions
        intent_analysis = state.context.get("intent_analysis", {})
        domain_indicators = intent_analysis.get("domain_indicators", {})
        if domain_indicators.get("pdb"):
            pdb_ids.extend(domain_indicators["pdb"])
        
        return list(set(pdb_ids))  # Remove duplicates
    
    def _extract_pdb_ids(self, text: str) -> List[str]:
        """Extract PDB IDs from text using regex patterns."""
        pdb_patterns = [
            r'\b([1-9][A-Z0-9]{3})\b',  # Direct PDB ID
            r'(?i)(?:show|display|load|view)\s+(?:me\s+)?(?:structure\s+|protein\s+)?([1-9][A-Z0-9]{3})',
            r'(?i)(?:get|fetch|find)\s+(?:structure\s+|protein\s+)?([1-9][A-Z0-9]{3})',
        ]
        
        detected_pdbs = []
        for pattern in pdb_patterns:
            matches = re.findall(pattern, text)
            if matches:
                detected_pdbs.extend(matches)
        
        # Validate and clean PDB IDs
        valid_pdbs = []
        for pdb_id in detected_pdbs:
            pdb_id = pdb_id.upper()
            if len(pdb_id) == 4 and pdb_id[0].isdigit():
                valid_pdbs.append(pdb_id)
        
        return valid_pdbs
    
    def _detect_protein_names(self, state: AgentState) -> List[str]:
        """Detect protein names that can be mapped to PDB IDs."""
        protein_names = []
        
        # First check context from conversation agent (higher priority)
        intent_analysis = state.context.get("intent_analysis", {})
        domain_indicators = intent_analysis.get("domain_indicators", {})
        pdb_indicators = domain_indicators.get("pdb", [])
        
        # Check if any PDB indicators are protein names in our mapping
        for indicator in pdb_indicators:
            if indicator in self.protein_mappings:
                protein_names.append(indicator)
                self.logger.info(f"Found protein name in context: {indicator}")
        
        # Also check original message as fallback
        if state.messages:
            last_message = state.messages[-1]
            if isinstance(last_message, HumanMessage):
                message_lower = last_message.content.lower()
                
                for protein_name in self.protein_mappings.keys():
                    if protein_name in message_lower and protein_name not in protein_names:
                        # Check if it's a structure request
                        structure_keywords = ['structure', 'show', 'display', 'view', 'load', 'protein']
                        if any(keyword in message_lower for keyword in structure_keywords):
                            protein_names.append(protein_name)
        
        return protein_names
    
    def _extract_search_parameters(self, state: AgentState) -> Dict[str, Any]:
        """Extract search parameters from state."""
        params = {
            "pdb_ids": [],
            "protein_names": [],
            "keywords": [],
            "search_type": "mixed"
        }
        
        # Get PDB IDs
        params["pdb_ids"] = self._detect_pdb_requests(state)
        
        # Get protein names
        params["protein_names"] = self._detect_protein_names(state)
        
        # Get keywords from parameters
        if state.parameters.get("query"):
            params["keywords"].append(state.parameters["query"])
        
        if state.parameters.get("search_type"):
            params["search_type"] = state.parameters["search_type"]
        
        return params
    
    async def _perform_searches(self, search_params: Dict[str, Any], state: AgentState) -> Dict[str, Any]:
        """Perform the actual PDB searches."""
        results = {
            "pdb_searches": [],
            "protein_searches": [],
            "keyword_searches": [],
            "total_found": 0
        }
        
        async with self.search_engine:
            # Search by PDB IDs
            for pdb_id in search_params["pdb_ids"]:
                try:
                    self.logger.info("Searching PDB by ID", pdb_id=pdb_id)
                    result = await self.search_engine.search_by_id(pdb_id)
                    
                    if result.get("status") == "success":
                        results["pdb_searches"].append(result)
                        results["total_found"] += 1
                        self.logger.info("PDB structure found", pdb_id=pdb_id, title=result.get("title", "")[:50])
                    else:
                        self.logger.warning("PDB structure not found", pdb_id=pdb_id)
                        
                except Exception as e:
                    self.logger.error("PDB search failed", pdb_id=pdb_id, error=str(e))
            
            # Search by protein names (convert to PDB IDs)
            for protein_name in search_params["protein_names"]:
                if protein_name in self.protein_mappings:
                    pdb_id = self.protein_mappings[protein_name]
                    try:
                        self.logger.info("Searching protein by name", protein_name=protein_name, mapped_pdb_id=pdb_id)
                        result = await self.search_engine.search_by_id(pdb_id)
                        
                        if result.get("status") == "success":
                            result["protein_name"] = protein_name  # Add original protein name
                            results["protein_searches"].append(result)
                            results["total_found"] += 1
                            self.logger.info("Protein structure found", protein_name=protein_name, pdb_id=pdb_id)
                            
                    except Exception as e:
                        self.logger.error("Protein search failed", protein_name=protein_name, error=str(e))
            
            # Keyword searches
            for keyword in search_params["keywords"]:
                if keyword and not self._is_pdb_id(keyword):
                    try:
                        self.logger.info("Searching PDB by keyword", keyword=keyword)
                        result = await self.search_engine.search_by_keyword(keyword)
                        
                        if result.get("status") == "success":
                            results["keyword_searches"].append(result)
                            # Keyword searches might return multiple results
                            if isinstance(result.get("results"), list):
                                results["total_found"] += len(result["results"])
                            else:
                                results["total_found"] += 1
                                
                    except Exception as e:
                        self.logger.error("Keyword search failed", keyword=keyword, error=str(e))
        
        return results
    
    def _is_pdb_id(self, text: str) -> bool:
        """Check if text looks like a PDB ID."""
        return bool(re.match(r'^[1-9][A-Z0-9]{3}$', text.upper()))
    
    def _process_search_results(self, search_results: Dict[str, Any], state: AgentState) -> Dict[str, Any]:
        """Process search results and create visualization actions."""
        processed = {
            "structures_found": [],
            "actions": [],
            "metadata": {
                "total_searches": len(search_results["pdb_searches"]) + len(search_results["protein_searches"]),
                "total_found": search_results["total_found"],
                "search_timestamp": datetime.utcnow().isoformat()
            }
        }
        
        # Process PDB searches
        for result in search_results["pdb_searches"]:
            structure_info = self._extract_structure_info(result)
            processed["structures_found"].append(structure_info)
            
            # Create visualization action
            action = self._create_visualization_action(result, "pdb_search", state)
            processed["actions"].append(action)
        
        # Process protein searches
        for result in search_results["protein_searches"]:
            structure_info = self._extract_structure_info(result)
            structure_info["protein_name"] = result.get("protein_name")  # Add protein name
            processed["structures_found"].append(structure_info)
            
            # Create visualization action
            action = self._create_visualization_action(result, "protein_search", state)
            processed["actions"].append(action)
        
        return processed
    
    def _extract_structure_info(self, search_result: Dict[str, Any]) -> Dict[str, Any]:
        """Extract key structure information from search result."""
        return {
            "pdb_id": search_result.get("pdb_id"),
            "title": search_result.get("title", ""),
            "resolution": search_result.get("resolution"),
            "experiment_type": search_result.get("experiment_type", ""),
            "organism": search_result.get("organism", []),
            "release_date": search_result.get("release_date"),
            "molecular_weight": search_result.get("molecular_weight"),
            "structure_url": f"https://files.rcsb.org/download/{search_result.get('pdb_id')}.pdb" if search_result.get('pdb_id') else None
        }
    
    def _create_visualization_action(self, search_result: Dict[str, Any], search_type: str, state: AgentState) -> Dict[str, Any]:
        """Create visualization action for frontend."""
        pdb_id = search_result.get("pdb_id")
        protein_name = search_result.get("protein_name")
        
        # Create description based on search type
        if protein_name and search_type == "protein_search":
            description = f"Load and display {protein_name} structure (PDB: {pdb_id})"
        else:
            description = f"Load and display PDB structure {pdb_id}"
        
        return {
            "id": f"pdb_action_{pdb_id}_{int(time.time())}",
            "type": "structure_visualization",
            "description": description,
            "result": {
                "pdb_id": pdb_id,
                "structure_url": f"https://files.rcsb.org/download/{pdb_id}.pdb",
                "title": search_result.get("title", ""),
                "resolution": search_result.get("resolution"),
                "experiment_type": search_result.get("experiment_type", ""),
                "organism": search_result.get("organism", []),
                "search_type": search_type,
                "protein_name": protein_name  # Include original protein name if available
            },
            "timestamp": int(time.time() * 1000),
            "duration": 0,
            "success": True,
            "metadata": {
                "source": "pdb_search_agent",
                "pdb_id": pdb_id,
                "protein_name": protein_name,
                "workflow_id": state.workflow_id
            }
        }
    
    def _extract_molecular_data(self, processed_results: Dict[str, Any]) -> Dict[str, Any]:
        """Extract molecular data for other agents."""
        molecular_data = {}
        
        if processed_results["structures_found"]:
            # Use the first structure as primary data
            primary_structure = processed_results["structures_found"][0]
            molecular_data.update({
                "pdb_id": primary_structure["pdb_id"],
                "structure_url": primary_structure["structure_url"],
                "structure_metadata": primary_structure
            })
            
            # If multiple structures, store all
            if len(processed_results["structures_found"]) > 1:
                molecular_data["all_structures"] = processed_results["structures_found"]
        
        return molecular_data
    
    def _generate_response_message(self, processed_results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate human-readable response message."""
        structures = processed_results["structures_found"]
        total_found = len(structures)
        
        if total_found == 0:
            return {
                "content": "No structures found matching your search criteria. Please check the PDB ID or try different keywords.",
                "type": "no_results"
            }
        
        if total_found == 1:
            structure = structures[0]
            content = f"🧬 **Structure Found: {structure['pdb_id']}**\n\n"
            content += f"**{structure['title']}**\n\n"
            
            details = []
            if structure.get("resolution"):
                details.append(f"Resolution: {structure['resolution']}Å")
            if structure.get("experiment_type"):
                details.append(f"Method: {structure['experiment_type']}")
            if structure.get("organism"):
                organisms = structure['organism'][:2]  # Show first 2 organisms
                organisms_str = ", ".join(organisms) + ("..." if len(structure['organism']) > 2 else "")
                details.append(f"Organism: {organisms_str}")
            
            if details:
                content += " | ".join(details) + "\n\n"
            
            content += "✅ The 3D structure has been loaded in the viewer!"
            
        else:
            content = f"🧬 **{total_found} Structures Found**\n\n"
            for structure in structures[:3]:  # Show first 3
                content += f"**{structure['pdb_id']}**: {structure['title'][:80]}{'...' if len(structure['title']) > 80 else ''}\n"
            
            if total_found > 3:
                content += f"\n... and {total_found - 3} more structures\n"
            
            content += "\n✅ All structures have been loaded in the viewer!"
        
        return {
            "content": content,
            "type": "search_results"
        }
    
    def _determine_next_agent(self, processed_results: Dict[str, Any], state: AgentState) -> Optional[str]:
        """Determine next agent based on search results."""
        # If structures were found and analysis is requested, go to analysis
        if processed_results["structures_found"]:
            # Check if analysis was requested in original message
            if state.messages:
                last_message = state.messages[-1]
                if isinstance(last_message, HumanMessage):
                    message_content = last_message.content.lower()
                    analysis_keywords = ["analyze", "analysis", "binding", "active site", "properties"]
                    if any(keyword in message_content for keyword in analysis_keywords):
                        return "molecular_analysis_agent"
            
            # Check context for analysis intent
            intent_analysis = state.context.get("intent_analysis", {})
            if intent_analysis.get("primary_intent") == "analysis_request":
                return "molecular_analysis_agent"
        
        return None


# Register the PDB search agent globally
pdb_search_agent = PDBSearchAgent()
agent_registry.register_agent(pdb_search_agent)