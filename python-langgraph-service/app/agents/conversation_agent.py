"""
ConversationAgent for natural language processing and response generation.
Uses LangGraph native messaging without LangChain dependencies.
"""

import re
import time
from typing import Dict, Any, List, Optional
from datetime import datetime

import structlog
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from .base_agent import BaseAgent, AgentType, AgentState, agent_registry
from ..config import get_settings

logger = structlog.get_logger(__name__)


class ConversationAgent(BaseAgent):
    """
    Agent responsible for natural language understanding and conversation management.
    Handles user input interpretation and response generation.
    """
    
    def __init__(
        self,
        agent_id: str = "conversation_agent",
        config: Optional[Dict[str, Any]] = None
    ):
        super().__init__(agent_id, AgentType.CONVERSATION, config)
        self.llm = None
        self._initialize_llm()
    
    def _initialize_llm(self):
        """Initialize the language model."""
        try:
            settings = get_settings()
            self.llm = ChatOpenAI(
                api_key=settings.openai_api_key,
                base_url=settings.openai_base_url,
                model=settings.default_model,
                temperature=0.1,
            )
            self.logger.info("LLM initialized for conversation agent")
        except Exception as e:
            self.logger.error("Failed to initialize LLM", error=str(e))
            raise
    
    def can_handle(self, state: AgentState) -> bool:
        """Check if this agent can handle the current state."""
        if not state.messages:
            return True
        
        last_message = state.messages[-1]
        if isinstance(last_message, HumanMessage):
            return True
            
        if state.workflow_type == "conversation_processing":
            return True
            
        return False
    
    async def execute(self, state: AgentState) -> Dict[str, Any]:
        """Execute conversation processing."""
        await self.pre_execute(state)
        
        try:
            user_message = self._extract_user_message(state)
            self.logger.info("Processing conversation", user_message=user_message[:100])
            
            # Analyze user intent
            intent_analysis = await self._analyze_intent(user_message)
            
            # Check for specific domain requests
            domain_routing = self._check_domain_routing(user_message, intent_analysis)
            
            if domain_routing["should_route"]:
                # Hand off to specialized agent
                handoff = self.log_agent_handoff(
                    self.agent_id,
                    domain_routing["target_agent"],
                    domain_routing["reason"]
                )
                
                result = {
                    **state.dict(),
                    "current_agent": domain_routing["target_agent"],
                    "next_agent": domain_routing["target_agent"],
                    "agent_handoffs": state.agent_handoffs + [handoff],
                    "context": {
                        **state.context,
                        "intent_analysis": intent_analysis,
                        "routing_decision": domain_routing
                    }
                }
            else:
                # Handle conversation directly
                ai_response = await self._generate_response(user_message, state)
                
                # Add AI message to conversation
                ai_message = AIMessage(content=ai_response["content"])
                
                result = {
                    **state.dict(),
                    "messages": state.messages + [ai_message],
                    "current_agent": self.agent_id,
                    "context": {
                        **state.context,
                        "intent_analysis": intent_analysis,
                        "ai_response": ai_response
                    },
                    "completed_at": datetime.utcnow()
                }
            
            await self.post_execute(state, result)
            return result
            
        except Exception as e:
            error_msg = f"Conversation processing failed: {str(e)}"
            self.logger.error("Conversation execution failed", error=str(e))
            
            result = {
                **state.dict(),
                "error_state": error_msg,
                "current_agent": self.agent_id
            }
            
            await self.post_execute(state, result)
            return result
    
    def _extract_user_message(self, state: AgentState) -> str:
        """Extract user message from state."""
        if state.parameters.get("message"):
            return state.parameters["message"]
        
        if state.messages:
            last_message = state.messages[-1]
            if isinstance(last_message, HumanMessage):
                return last_message.content
        
        return state.parameters.get("query", "Hello")
    
    async def _analyze_intent(self, user_message: str) -> Dict[str, Any]:
        """Analyze user intent and extract entities."""
        analysis = {
            "primary_intent": "conversation",
            "confidence": 0.8,
            "entities": [],
            "keywords": [],
            "domain_indicators": {}
        }
        
        # Simple keyword-based intent analysis
        message_lower = user_message.lower()
        
        # PDB/Structure-related indicators
        pdb_id_pattern = r'\b([1-9][A-Z0-9]{3})\b'  # PDB ID pattern
        structure_display_patterns = [
            r'(?i)(?:show|display|load|view)\s+(?:[^.]*?(?:structure|protein))',
            r'(?i)(?:pdb|protein\s+data\s+bank)',
        ]
        
        pdb_indicators = []
        
        # Check for direct PDB IDs
        pdb_id_matches = re.findall(pdb_id_pattern, user_message)
        if pdb_id_matches:
            pdb_indicators.extend(pdb_id_matches)
        
        # Check for structure display requests
        for pattern in structure_display_patterns:
            if re.search(pattern, user_message):
                pdb_indicators.append("structure_display_request")
                break
        
        # Check for protein names - both with and without explicit display requests
        common_proteins = [
            'hemoglobin', 'insulin', 'lysozyme', 'myoglobin', 'cytochrome c',
            'collagen', 'albumin', 'immunoglobulin', 'antibody', 'ferritin',
            'catalase', 'pepsin', 'chymotrypsin', 'trypsin', 'ribonuclease',
            'carbonic anhydrase', 'alcohol dehydrogenase', 'lactate dehydrogenase',
            'pyruvate kinase', 'glyceraldehyde phosphate dehydrogenase', 'aldolase',
            'phosphoglycerate kinase', 'enolase', 'pyruvate dehydrogenase',
            'citrate synthase', 'isocitrate dehydrogenase', 'succinate dehydrogenase',
            'fumarase', 'malate dehydrogenase', 'glucose oxidase', 'peroxidase',
            'superoxide dismutase', 'glutathione peroxidase', 'thioredoxin',
            'calmodulin', 'actin', 'myosin', 'tubulin', 'keratin'
        ]
        
        # Detect protein names in message (including fuzzy matching for common typos)
        found_proteins = []
        for protein in common_proteins:
            if protein in message_lower:
                found_proteins.append(protein)
            else:
                # Check for common typos and variations
                protein_variations = self._get_protein_variations(protein)
                for variation in protein_variations:
                    if variation in message_lower and variation not in found_proteins:
                        found_proteins.append(protein)  # Add the correct name, not the typo
                        break
        
        # If protein names found, add them to PDB indicators
        if found_proteins:
            # Check if this might be a structure request
            structure_context_keywords = [
                'structure', 'show', 'display', 'view', 'load', 'protein', 
                'molecular', 'pdb', 'visualization', 'molecule', 'what', 'tell me about'
            ]
            has_structure_context = any(keyword in message_lower for keyword in structure_context_keywords)
            
            if has_structure_context:
                # Add the correctly detected protein names to PDB indicators
                pdb_indicators.extend(found_proteins)
                if not any("structure_display_request" in ind for ind in pdb_indicators):
                    pdb_indicators.append("structure_display_request")
                    
                # Log the protein detection for debugging
                print(f"🧬 DETECTED PROTEINS: {found_proteins} from message: '{user_message[:50]}...'")
            else:
                # Even without explicit structure keywords, if we found protein names, it's likely a structure request
                print(f"🧬 DETECTED PROTEINS WITHOUT EXPLICIT STRUCTURE KEYWORDS: {found_proteins}")
                pdb_indicators.extend(found_proteins)
                pdb_indicators.append("protein_mention")
        
        if pdb_indicators:
            analysis["domain_indicators"]["pdb"] = pdb_indicators
            analysis["primary_intent"] = "structure_request"
        
        # Molecular analysis indicators (excluding structure if already detected as PDB request)
        analysis_keywords = [
            "analyze", "analysis", "binding", "active site",
            "secondary structure", "hydrogen bonds", "molecular weight",
            "properties", "sequence", "cavity", "hydrophobic"
        ]
        
        # Only add "structure" as analysis keyword if it's not already a PDB request
        if not pdb_indicators:
            analysis_keywords.append("structure")
        
        found_analysis_keywords = [kw for kw in analysis_keywords if kw in message_lower]
        if found_analysis_keywords:
            analysis["domain_indicators"]["molecular_analysis"] = found_analysis_keywords
            if analysis["primary_intent"] == "conversation":
                analysis["primary_intent"] = "analysis_request"
        
        # General keywords
        analysis["keywords"] = [
            word for word in message_lower.split()
            if len(word) > 3 and word not in ["the", "and", "for", "with"]
        ]
        
        return analysis
    
    def _check_domain_routing(self, user_message: str, intent_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Check if message should be routed to specialized agents."""
        routing = {
            "should_route": False,
            "target_agent": None,
            "reason": "",
            "confidence": 0.0
        }
        
        # Route to PDB search agent for structure requests
        if intent_analysis.get("domain_indicators", {}).get("pdb"):
            routing = {
                "should_route": True,
                "target_agent": "pdb_search_agent",
                "reason": "PDB structure request detected",
                "confidence": 0.9
            }
        # Route to molecular analysis agent for analysis requests
        elif intent_analysis.get("domain_indicators", {}).get("molecular_analysis"):
            routing = {
                "should_route": True,
                "target_agent": "molecular_analysis_agent", 
                "reason": "Molecular analysis request detected",
                "confidence": 0.8
            }
        
        return routing
    
    async def _generate_response(self, user_message: str, state: AgentState) -> Dict[str, Any]:
        """Generate AI response for general conversation."""
        try:
            system_prompt = """You are BioAI, an expert AI assistant specialized in molecular biology, biochemistry, and protein analysis.

You have access to powerful scientific tools including:
- BioPython for protein structure analysis
- Real-time PDB (Protein Data Bank) database search
- Molecular structure comparison capabilities
- Small molecule analysis tools

You should:
1. Provide helpful, accurate scientific information
2. Offer to analyze specific proteins/molecules when relevant
3. Ask clarifying questions to better help with scientific tasks
4. Be conversational and engaging while maintaining scientific accuracy

If users ask about molecular analysis, protein structures, PDB IDs, or related topics, offer to use your scientific tools to help them."""

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_message)
            ]
            
            # Add conversation history if available
            if len(state.messages) > 1:
                # Include recent conversation context
                recent_messages = state.messages[-4:]  # Last 4 messages
                messages = [SystemMessage(content=system_prompt)] + recent_messages + [HumanMessage(content=user_message)]
            
            self.logger.info("Calling LLM for response generation")
            ai_response = await self.llm.ainvoke(messages)
            
            return {
                "content": ai_response.content,
                "type": "conversation",
                "metadata": {
                    "model": self.llm.model_name if hasattr(self.llm, 'model_name') else "unknown",
                    "tokens_used": len(ai_response.content) // 4,  # Rough estimate
                    "response_time": time.time()
                }
            }
            
        except Exception as e:
            self.logger.error("Failed to generate AI response", error=str(e))
            # Fallback response
            return {
                "content": "I'm BioAI, your molecular analysis assistant! I can help you with protein analysis, PDB database searches, and molecular structure comparisons. How can I assist you today?",
                "type": "fallback",
                "metadata": {"error": str(e)}
            }
    
    def _detect_protein_names(self, message: str) -> List[str]:
        """Detect common protein names in user messages."""
        protein_names = [
            'hemoglobin', 'insulin', 'lysozyme', 'myoglobin', 'cytochrome c',
            'collagen', 'albumin', 'immunoglobulin', 'antibody', 'ferritin',
            'catalase', 'pepsin', 'chymotrypsin', 'trypsin', 'ribonuclease'
        ]
        
        message_lower = message.lower()
        found_proteins = [protein for protein in protein_names if protein in message_lower]
        return found_proteins
    
    def _get_protein_variations(self, protein_name: str) -> List[str]:
        """Get common variations and typos for protein names."""
        variations = []
        
        # Common variations for specific proteins
        variation_map = {
            'hemoglobin': ['hamoglobin', 'haemoglobin', 'hemogoblin', 'hemoglobn'],
            'insulin': ['insuline', 'insuln'],
            'lysozyme': ['lysozym', 'lysozime'],
            'myoglobin': ['myogloblin', 'myoglobn'],
            'cytochrome c': ['cytochrome', 'cytocrome'],
            'collagen': ['collagene', 'colagen'],
            'albumin': ['albumen'],
            'immunoglobulin': ['immunogloblin'],
            'ferritin': ['ferittin'],
            'catalase': ['catalaze'],
            'chymotrypsin': ['chymotripsin'],
            'trypsin': ['tripsin'],
            'ribonuclease': ['ribonuclease', 'rnase']
        }
        
        if protein_name in variation_map:
            variations.extend(variation_map[protein_name])
        
        return variations


# Register the conversation agent globally
conversation_agent = ConversationAgent()
agent_registry.register_agent(conversation_agent)