"""
LangGraph Multi-Agent Workflow Engine.
Replaces the legacy engine with pure LangGraph implementation using specialized agents.
"""

from typing import Dict, Any, Optional, List
import asyncio
import time
import uuid
from datetime import datetime

import structlog
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage

from .base_agent import AgentState, agent_registry
from .conversation_agent import conversation_agent
from .molecular_analysis_agent import molecular_analysis_agent
from .pdb_search_agent import pdb_search_agent
from .orchestration_agent import orchestration_agent
from ..config import get_settings
from ..core.chat_logger import get_chat_logger

logger = structlog.get_logger(__name__)


class LangGraphMultiAgentEngine:
    """
    Pure LangGraph implementation with multi-agent system.
    Uses StateGraph for workflow management and specialized agents for domain tasks.
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.compiled_graph = None
        self.active_workflows: Dict[str, AgentState] = {}
        
        # Initialize agents
        self._initialize_agents()
        
        # Build and compile the graph
        self._build_graph()
    
    def _initialize_agents(self):
        """Initialize all agents and ensure they're registered."""
        self.agents = {
            "conversation_agent": conversation_agent,
            "molecular_analysis_agent": molecular_analysis_agent,
            "pdb_search_agent": pdb_search_agent,
            "orchestration_agent": orchestration_agent
        }
        
        logger.info("Multi-agent system initialized", 
                   total_agents=len(self.agents),
                   registered_agents=len(agent_registry._agents))
    
    def _build_graph(self):
        """Build the LangGraph state graph with agent nodes."""
        
        # Create the graph with AgentState as the schema class
        from typing import Dict, Any
        graph = StateGraph(Dict[str, Any])
        
        # Add agent nodes
        graph.add_node("route_request", self._route_request_node)
        graph.add_node("conversation_agent", self._conversation_agent_node)
        graph.add_node("pdb_search_agent", self._pdb_search_agent_node)
        graph.add_node("molecular_analysis_agent", self._molecular_analysis_agent_node)
        graph.add_node("orchestration_agent", self._orchestration_agent_node)
        graph.add_node("finalize_response", self._finalize_response_node)
        
        # Define the entry point
        graph.set_entry_point("route_request")
        
        # Add conditional edges for routing
        graph.add_conditional_edges(
            "route_request",
            self._routing_decision,
            {
                "conversation": "conversation_agent",
                "pdb_search": "pdb_search_agent", 
                "molecular_analysis": "molecular_analysis_agent",
                "orchestration": "orchestration_agent",
                "end": END
            }
        )
        
        # Add edges from agents to finalize or further routing
        graph.add_conditional_edges(
            "conversation_agent",
            self._post_agent_routing,
            {
                "pdb_search": "pdb_search_agent",
                "molecular_analysis": "molecular_analysis_agent",
                "finalize": "finalize_response",
                "end": END
            }
        )
        
        graph.add_conditional_edges(
            "pdb_search_agent",
            self._post_agent_routing,
            {
                "molecular_analysis": "molecular_analysis_agent",
                "conversation": "conversation_agent",
                "finalize": "finalize_response",
                "end": END
            }
        )
        
        graph.add_conditional_edges(
            "molecular_analysis_agent",
            self._post_agent_routing,
            {
                "conversation": "conversation_agent",
                "finalize": "finalize_response",
                "end": END
            }
        )
        
        graph.add_conditional_edges(
            "orchestration_agent",
            self._post_agent_routing,
            {
                "finalize": "finalize_response",
                "end": END
            }
        )
        
        # Finalize response always ends
        graph.add_edge("finalize_response", END)
        
        # Compile the graph
        self.compiled_graph = graph.compile()
        logger.info("LangGraph multi-agent workflow compiled successfully")
    
    async def _route_request_node(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Initial routing node to determine which agent should handle the request."""
        logger.info("Routing request", workflow_id=state.get("workflow_id"))
        
        # Update routing metadata
        return {
            **state,
            "current_agent": "route_request"
        }
    
    def _routing_decision(self, state: Dict[str, Any]) -> str:
        """Decide which agent should handle the initial request."""
        
        # Convert dict to AgentState for agent routing decisions
        agent_state = AgentState(**state)
        
        # Check for orchestration needs first
        if orchestration_agent.can_handle(agent_state):
            logger.info("Routing to orchestration agent", workflow_id=state.get("workflow_id"))
            return "orchestration"
        
        # Check for PDB search requests
        if pdb_search_agent.can_handle(agent_state):
            logger.info("Routing to PDB search agent", workflow_id=state.get("workflow_id"))
            return "pdb_search"
        
        # Check for molecular analysis requests
        if molecular_analysis_agent.can_handle(agent_state):
            logger.info("Routing to molecular analysis agent", workflow_id=state.get("workflow_id"))
            return "molecular_analysis"
        
        # Default to conversation agent
        logger.info("Routing to conversation agent", workflow_id=state.get("workflow_id"))
        return "conversation"
    
    async def _conversation_agent_node(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Execute conversation agent."""
        logger.info("Executing conversation agent", workflow_id=state.get("workflow_id"))
        
        try:
            agent_state = AgentState(**state)
            result = await conversation_agent.execute(agent_state)
            return result
        except Exception as e:
            logger.error("Conversation agent failed", error=str(e), workflow_id=state.get("workflow_id"))
            return {**state, "error_state": f"Conversation agent failed: {str(e)}"}
    
    async def _pdb_search_agent_node(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Execute PDB search agent."""
        logger.info("Executing PDB search agent", workflow_id=state.get("workflow_id"))
        
        try:
            agent_state = AgentState(**state)
            result = await pdb_search_agent.execute(agent_state)
            return result
        except Exception as e:
            logger.error("PDB search agent failed", error=str(e), workflow_id=state.get("workflow_id"))
            return {**state, "error_state": f"PDB search agent failed: {str(e)}"}
    
    async def _molecular_analysis_agent_node(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Execute molecular analysis agent."""
        logger.info("Executing molecular analysis agent", workflow_id=state.get("workflow_id"))
        
        try:
            agent_state = AgentState(**state)
            result = await molecular_analysis_agent.execute(agent_state)
            return result
        except Exception as e:
            logger.error("Molecular analysis agent failed", error=str(e), workflow_id=state.get("workflow_id"))
            return {**state, "error_state": f"Molecular analysis agent failed: {str(e)}"}
    
    async def _orchestration_agent_node(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Execute orchestration agent."""
        logger.info("Executing orchestration agent", workflow_id=state.get("workflow_id"))
        
        try:
            agent_state = AgentState(**state)
            result = await orchestration_agent.execute(agent_state)
            return result
        except Exception as e:
            logger.error("Orchestration agent failed", error=str(e), workflow_id=state.get("workflow_id"))
            return {**state, "error_state": f"Orchestration agent failed: {str(e)}"}
    
    def _post_agent_routing(self, state: Dict[str, Any]) -> str:
        """Determine next step after agent execution."""
        
        # If error occurred, finalize with error
        if state.get("error_state"):
            return "finalize"
        
        # Check for explicit next agent routing
        next_agent = state.get("next_agent")
        if next_agent and next_agent in self.agents:
            logger.info("Routing to next agent", 
                       current_agent=state.get("current_agent"),
                       next_agent=next_agent,
                       workflow_id=state.get("workflow_id"))
            
            if next_agent == "conversation_agent":
                return "conversation"
            elif next_agent == "pdb_search_agent":
                return "pdb_search"
            elif next_agent == "molecular_analysis_agent":
                return "molecular_analysis"
        
        # If completed timestamp is set, finalize
        if state.get("completed_at"):
            return "finalize"
        
        # Default to finalize
        return "finalize"
    
    async def _finalize_response_node(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Finalize the workflow response."""
        logger.info("Finalizing workflow response", workflow_id=state.get("workflow_id"))
        
        # Ensure completed timestamp
        if not state.get("completed_at"):
            state["completed_at"] = datetime.utcnow()
        
        # Mark as current agent for logging
        return {
            **state,
            "current_agent": "finalize_response"
        }
    
    async def execute_workflow(
        self,
        workflow_type: str,
        parameters: Dict[str, Any],
        workflow_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Execute a workflow using the multi-agent system.
        
        Args:
            workflow_type: Type of workflow to execute
            parameters: Workflow parameters
            workflow_id: Optional workflow ID for tracking
            
        Returns:
            Workflow execution results
        """
        if not workflow_id:
            workflow_id = f"wf_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        
        logger.info(
            "🚀 MULTI-AGENT WORKFLOW START",
            workflow_type=workflow_type,
            workflow_id=workflow_id,
            parameters_keys=list(parameters.keys()) if parameters else []
        )
        
        try:
            # Create initial state
            initial_state = self._create_initial_state(
                workflow_type, parameters, workflow_id
            )
            
            # Store active workflow
            self.active_workflows[workflow_id] = initial_state
            
            # Execute workflow through LangGraph (pass as dict)
            start_time = time.time()
            final_state = await self.compiled_graph.ainvoke(initial_state.dict())
            execution_time = time.time() - start_time
            
            # Convert back to AgentState for processing
            # Handle datetime serialization issues
            processed_state = final_state.copy()
            if "started_at" in processed_state and isinstance(processed_state["started_at"], str):
                processed_state["started_at"] = datetime.fromisoformat(processed_state["started_at"].replace("Z", "+00:00"))
            if "completed_at" in processed_state and processed_state["completed_at"] and isinstance(processed_state["completed_at"], str):
                processed_state["completed_at"] = datetime.fromisoformat(processed_state["completed_at"].replace("Z", "+00:00"))
            
            final_agent_state = AgentState(**processed_state)
            
            # Clean up active workflow
            if workflow_id in self.active_workflows:
                del self.active_workflows[workflow_id]
            
            # Process final result
            result = self._process_final_result(final_agent_state, execution_time)
            
            logger.info(
                "✅ MULTI-AGENT WORKFLOW COMPLETED",
                workflow_type=workflow_type,
                workflow_id=workflow_id,
                execution_time=execution_time,
                success=not result.get("error")
            )
            
            return result
            
        except Exception as e:
            logger.error(
                "❌ MULTI-AGENT WORKFLOW FAILED",
                workflow_type=workflow_type,
                workflow_id=workflow_id,
                error=str(e)
            )
            
            # Clean up on error
            if workflow_id in self.active_workflows:
                del self.active_workflows[workflow_id]
            
            return self._create_error_result(workflow_id, str(e))
    
    def _create_initial_state(
        self, 
        workflow_type: str, 
        parameters: Dict[str, Any], 
        workflow_id: str
    ) -> AgentState:
        """Create initial agent state for workflow."""
        
        # Create initial message if provided
        messages = []
        if parameters.get("message"):
            messages.append(HumanMessage(content=parameters["message"]))
        elif parameters.get("messages"):
            # Convert messages to proper format
            for msg in parameters["messages"]:
                if isinstance(msg, dict):
                    if msg.get("role") == "user":
                        messages.append(HumanMessage(content=msg.get("content", "")))
                    elif msg.get("role") == "assistant":
                        messages.append(AIMessage(content=msg.get("content", "")))
                elif isinstance(msg, BaseMessage):
                    messages.append(msg)
        
        return AgentState(
            workflow_id=workflow_id,
            workflow_type=workflow_type,
            messages=messages,
            parameters=parameters,
            started_at=datetime.utcnow(),
            context=parameters.get("context", {})
        )
    
    def _process_final_result(self, final_state: AgentState, execution_time: float) -> Dict[str, Any]:
        """Process final workflow result into expected format."""
        
        # Extract response from messages
        response_content = "Workflow completed."
        if final_state.messages:
            last_message = final_state.messages[-1]
            if isinstance(last_message, AIMessage):
                response_content = last_message.content
        
        # Handle error states
        if final_state.error_state:
            return {
                "workflowId": final_state.workflow_id,
                "response": f"Workflow failed: {final_state.error_state}",
                "actions": [],
                "newContext": {"error": final_state.error_state},
                "suggestedFollowUps": [
                    "Please try again with different parameters",
                    "Check the logs for more details",
                    "Contact support if the issue persists"
                ],
                "metadata": {
                    "tokensUsed": 0,
                    "duration": int(execution_time * 1000),
                    "toolsInvoked": [final_state.current_agent] if final_state.current_agent else [],
                    "confidence": 0,
                    "sources": [],
                    "error": final_state.error_state
                },
                "status": "failed"
            }
        
        # Extract actions (visualization commands)
        actions = final_state.visualization_commands or []
        
        # Extract tools invoked from agent handoffs
        tools_invoked = [handoff.get("to_agent", "") for handoff in final_state.agent_handoffs]
        if final_state.current_agent:
            tools_invoked.append(final_state.current_agent)
        tools_invoked = list(set(filter(None, tools_invoked)))  # Remove duplicates and empty strings
        
        # Generate suggested follow-ups based on results
        suggested_followups = self._generate_followups(final_state)
        
        return {
            "workflowId": final_state.workflow_id,
            "response": response_content,
            "actions": actions,
            "newContext": {
                "conversation_context": final_state.context,
                "molecular_data": final_state.molecular_data,
                "search_results": final_state.search_results,
                "analysis_results": final_state.analysis_results
            },
            "suggestedFollowUps": suggested_followups,
            "metadata": {
                "tokensUsed": len(response_content) // 4,  # Rough estimate
                "duration": int(execution_time * 1000),
                "toolsInvoked": tools_invoked,
                "confidence": 0.9 if not final_state.error_state else 0.1,
                "sources": self._extract_sources(final_state),
                "agents_involved": len(set(handoff.get("to_agent") for handoff in final_state.agent_handoffs))
            },
            "status": "completed"
        }
    
    def _generate_followups(self, final_state: AgentState) -> List[str]:
        """Generate contextual follow-up suggestions."""
        followups = []
        
        # Based on search results
        if final_state.search_results:
            structures = []
            for agent_results in final_state.search_results.values():
                if isinstance(agent_results, dict) and "structures_found" in agent_results:
                    structures.extend(agent_results["structures_found"])
            
            if structures:
                for structure in structures[:2]:  # First 2 structures
                    pdb_id = structure.get("pdb_id")
                    if pdb_id:
                        followups.extend([
                            f"Analyze the structure of {pdb_id}",
                            f"Compare {pdb_id} with similar proteins",
                            f"Show binding sites in {pdb_id}"
                        ])
        
        # Based on analysis results
        if final_state.analysis_results:
            followups.extend([
                "Can you explain these results in more detail?",
                "How do these properties affect protein function?",
                "Compare this with other similar structures"
            ])
        
        # Default suggestions if no specific context
        if not followups:
            followups = [
                "Can you analyze a specific protein structure?",
                "How can I search for proteins in the PDB database?",
                "Tell me about molecular analysis capabilities"
            ]
        
        return followups[:3]  # Limit to 3 suggestions
    
    def _extract_sources(self, final_state: AgentState) -> List[str]:
        """Extract data sources used in the workflow."""
        sources = []
        
        # Add PDB sources
        if final_state.search_results:
            for agent_results in final_state.search_results.values():
                if isinstance(agent_results, dict) and "structures_found" in agent_results:
                    for structure in agent_results["structures_found"]:
                        pdb_id = structure.get("pdb_id")
                        if pdb_id:
                            sources.append(f"PDB:{pdb_id}")
        
        # Add AI model source
        if final_state.messages:
            sources.append("OpenAI API via LangGraph Multi-Agent System")
        
        return list(set(sources))  # Remove duplicates
    
    def _create_error_result(self, workflow_id: str, error_message: str) -> Dict[str, Any]:
        """Create error result structure."""
        return {
            "workflowId": workflow_id,
            "response": f"Workflow execution failed: {error_message}",
            "actions": [],
            "newContext": {"error": error_message},
            "suggestedFollowUps": [
                "Please try again with different parameters",
                "Check the system logs for more details",
                "Contact support if the issue persists"
            ],
            "metadata": {
                "tokensUsed": 0,
                "duration": 0,
                "toolsInvoked": [],
                "confidence": 0,
                "sources": [],
                "error": error_message
            },
            "status": "failed"
        }
    
    async def get_workflow_status(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get status of an active workflow."""
        workflow = self.active_workflows.get(workflow_id)
        if workflow:
            return {
                "workflow_id": workflow_id,
                "current_agent": workflow.current_agent,
                "started_at": workflow.started_at.isoformat() if workflow.started_at else None,
                "status": "running" if not workflow.error_state else "error",
                "error": workflow.error_state,
                "progress": {
                    "agents_completed": len(workflow.agent_handoffs),
                    "current_step": workflow.current_agent
                }
            }
        return None
    
    async def stop_workflow(self, workflow_id: str) -> bool:
        """Stop an active workflow."""
        if workflow_id in self.active_workflows:
            del self.active_workflows[workflow_id]
            logger.info("Multi-agent workflow stopped", workflow_id=workflow_id)
            return True
        return False
    
    async def cleanup(self) -> None:
        """Cleanup resources."""
        logger.info("Cleaning up multi-agent workflow engine")
        self.active_workflows.clear()


# Create global instance
multi_agent_engine = LangGraphMultiAgentEngine()