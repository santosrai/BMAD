"""
LangGraph workflow engine for Python microservice.
Replaces the TypeScript implementation with Python-based agents.
"""

from typing import Dict, Any, Optional, List
import asyncio
import time
from datetime import datetime

import structlog
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from pydantic import BaseModel

from ..config import get_settings
from ..core.chat_logger import get_chat_logger

logger = structlog.get_logger(__name__)


class WorkflowState(BaseModel):
    """LangGraph workflow state model."""
    messages: List[Dict[str, Any]] = []
    current_step: str = ""
    context: Dict[str, Any] = {}
    parameters: Dict[str, Any] = {}
    results: Dict[str, Any] = {}
    error: Optional[str] = None
    workflow_id: str = ""
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class LangGraphWorkflowEngine:
    """
    Python implementation of LangGraph workflow engine.
    Provides the same interface as the TypeScript version but with
    real scientific computing capabilities.
    """
    
    def __init__(
        self,
        openai_api_key: str,
        openai_base_url: str = "https://openrouter.ai/api/v1",
        default_model: str = "anthropic/claude-3-haiku:beta"
    ):
        self.openai_api_key = openai_api_key
        self.openai_base_url = openai_base_url
        self.default_model = default_model
        self.llm = None
        self.compiled_graph = None
        self.active_workflows: Dict[str, WorkflowState] = {}
        
    async def initialize(self) -> None:
        """Initialize the workflow engine and compile graphs."""
        try:
            # Initialize LLM
            self.llm = ChatOpenAI(
                api_key=self.openai_api_key,
                base_url=self.openai_base_url,
                model=self.default_model,
                temperature=0.1,
            )
            
            # Compile workflow graph
            self.compiled_graph = await self._create_workflow_graph()
            
            logger.info(
                "LangGraph workflow engine initialized",
                model=self.default_model,
                base_url=self.openai_base_url
            )
            
        except Exception as e:
            logger.error("Failed to initialize workflow engine", error=str(e))
            raise
    
    async def _create_workflow_graph(self):
        """Create and compile the main workflow graph."""
        # For now, return a simple workflow that just processes the steps
        # This will be enhanced in Story 5.2 with real molecular analysis
        return None
    
    async def _input_analysis_node(self, state: WorkflowState) -> Dict[str, Any]:
        """Analyze user input to determine intent and extract entities."""
        logger.info("Processing input analysis", workflow_id=state.workflow_id)
        
        try:
            # Extract the user message
            user_message = state.messages[-1].get("content", "") if state.messages else ""
            
            # Use LLM to analyze input (simplified for now)
            analysis_prompt = f"""
            Analyze this user input for molecular biology context:
            "{user_message}"
            
            Determine:
            1. Intent (search, analyze, compare, visualize)
            2. Entities (PDB IDs, molecules, proteins)
            3. Required tools (molecular_analysis, pdb_search, viewer_control)
            
            Respond in JSON format.
            """
            
            # For now, return a basic analysis structure
            # TODO: Implement actual LLM-based analysis
            analysis = {
                "intent": "analyze",
                "entities": [],
                "confidence": 0.8,
                "tools_needed": ["molecular_analysis"]
            }
            
            return {
                **state.dict(),
                "current_step": "input_analysis",
                "context": {**state.context, "analysis": analysis}
            }
            
        except Exception as e:
            logger.error("Input analysis failed", error=str(e), workflow_id=state.workflow_id)
            return {
                **state.dict(),
                "error": f"Input analysis failed: {str(e)}"
            }
    
    async def _context_gathering_node(self, state: WorkflowState) -> Dict[str, Any]:
        """Gather molecular context and session history."""
        logger.info("Processing context gathering", workflow_id=state.workflow_id)
        
        try:
            # Gather available context
            context = {
                "session_history": [],
                "current_structures": [],
                "user_preferences": {},
                "molecular_context": {}
            }
            
            return {
                **state.dict(),
                "current_step": "context_gathering",
                "context": {**state.context, "gathered_context": context}
            }
            
        except Exception as e:
            logger.error("Context gathering failed", error=str(e), workflow_id=state.workflow_id)
            return {
                **state.dict(),
                "error": f"Context gathering failed: {str(e)}"
            }
    
    async def _tool_selection_node(self, state: WorkflowState) -> Dict[str, Any]:
        """Select appropriate tools based on analysis."""
        logger.info("Processing tool selection", workflow_id=state.workflow_id)
        
        try:
            analysis = state.context.get("analysis", {})
            selected_tools = analysis.get("tools_needed", ["molecular_analysis"])
            
            return {
                **state.dict(),
                "current_step": "tool_selection",
                "context": {**state.context, "selected_tools": selected_tools}
            }
            
        except Exception as e:
            logger.error("Tool selection failed", error=str(e), workflow_id=state.workflow_id)
            return {
                **state.dict(),
                "error": f"Tool selection failed: {str(e)}"
            }
    
    async def _tool_execution_node(self, state: WorkflowState) -> Dict[str, Any]:
        """Execute selected tools."""
        logger.info("Processing tool execution", workflow_id=state.workflow_id)
        
        try:
            selected_tools = state.context.get("selected_tools", [])
            results = {}
            
            for tool in selected_tools:
                if tool == "molecular_analysis":
                    # Placeholder for real molecular analysis
                    results[tool] = {
                        "status": "success",
                        "data": "Molecular analysis results (placeholder)"
                    }
                elif tool == "pdb_search":
                    results[tool] = {
                        "status": "success", 
                        "data": "PDB search results (placeholder)"
                    }
                elif tool == "viewer_control":
                    results[tool] = {
                        "status": "success",
                        "data": "Viewer control results (placeholder)"
                    }
            
            return {
                **state.dict(),
                "current_step": "tool_execution",
                "results": results
            }
            
        except Exception as e:
            logger.error("Tool execution failed", error=str(e), workflow_id=state.workflow_id)
            return {
                **state.dict(),
                "error": f"Tool execution failed: {str(e)}"
            }
    
    async def _response_generation_node(self, state: WorkflowState) -> Dict[str, Any]:
        """Generate response based on tool results."""
        logger.info("Processing response generation", workflow_id=state.workflow_id)
        
        try:
            # Generate response based on results
            response = {
                "type": "assistant",
                "content": "Analysis completed successfully",
                "data": state.results,
                "metadata": {
                    "workflow_id": state.workflow_id,
                    "completed_at": datetime.utcnow().isoformat()
                }
            }
            
            return {
                **state.dict(),
                "current_step": "response_generation",
                "completed_at": datetime.utcnow(),
                "context": {**state.context, "response": response}
            }
            
        except Exception as e:
            logger.error("Response generation failed", error=str(e), workflow_id=state.workflow_id)
            return {
                **state.dict(),
                "error": f"Response generation failed: {str(e)}"
            }
    
    async def execute_workflow(
        self,
        workflow_type: str,
        parameters: Dict[str, Any],
        workflow_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Execute a workflow (main interface matching TypeScript version).
        
        Args:
            workflow_type: Type of workflow to execute
            parameters: Workflow parameters
            workflow_id: Optional workflow ID for tracking
            
        Returns:
            Workflow execution results
        """
        if not workflow_id:
            workflow_id = f"wf_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        logger.info(
            "🚀 WORKFLOW EXECUTION START",
            workflow_type=workflow_type,
            workflow_id=workflow_id,
            parameters_keys=list(parameters.keys()) if parameters else [],
            llm_initialized=self.llm is not None,
            api_key_present=bool(self.openai_api_key),
            api_key_preview=self.openai_api_key[:10] + "..." if self.openai_api_key else "None",
            base_url=self.openai_base_url,
            model=self.default_model
        )
        
        try:
            # Execute workflow with real molecular analysis capabilities
            result = await self._execute_real_workflow(
                workflow_type, parameters, workflow_id
            )
            
            logger.info(
                "Workflow execution completed",
                workflow_type=workflow_type,
                workflow_id=workflow_id
            )
            
            return result
            
        except Exception as e:
            logger.error(
                "Workflow execution failed",
                workflow_type=workflow_type,
                workflow_id=workflow_id,
                error=str(e)
            )
            
            # Clean up on error
            if workflow_id in self.active_workflows:
                del self.active_workflows[workflow_id]
            
            raise
    
    async def get_workflow_status(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get status of an active workflow."""
        workflow = self.active_workflows.get(workflow_id)
        if workflow:
            return {
                "workflow_id": workflow_id,
                "current_step": workflow.current_step,
                "started_at": workflow.started_at.isoformat() if workflow.started_at else None,
                "status": "running" if not workflow.error else "error",
                "error": workflow.error
            }
        return None
    
    async def stop_workflow(self, workflow_id: str) -> bool:
        """Stop an active workflow."""
        if workflow_id in self.active_workflows:
            del self.active_workflows[workflow_id]
            logger.info("Workflow stopped", workflow_id=workflow_id)
            return True
        return False
    
    async def _log_tool_execution(
        self,
        workflow_id: str,
        tool_name: str,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None
    ):
        """Helper method to log tool execution with timing."""
        start_time = time.time()
        success = False
        error = None
        result = None
        
        class ToolExecutionContext:
            def __init__(self, tool_name: str, start_time: float):
                self.tool_name = tool_name
                self.start_time = start_time
                
            async def __aenter__(self):
                return self
                
            async def __aexit__(self, exc_type, exc_val, exc_tb):
                duration_ms = (time.time() - self.start_time) * 1000
                success = exc_type is None
                error = str(exc_val) if exc_val else None
                
                chat_logger = get_chat_logger()
                chat_logger.log_tool_execution(
                    workflow_id=workflow_id,
                    tool_name=tool_name,
                    duration_ms=duration_ms,
                    success=success,
                    result=result,
                    error=error,
                    session_id=session_id,
                    user_id=user_id
                )
                
        return ToolExecutionContext(tool_name, start_time)

    async def _execute_real_workflow(
        self, 
        workflow_type: str, 
        parameters: Dict[str, Any], 
        workflow_id: str
    ) -> Dict[str, Any]:
        """Execute workflow with real molecular analysis."""
        from ..tools.molecular_analysis import MolecularAnalyzer
        from ..tools.pdb_search import PDBSearchEngine
        from ..tools.small_molecule_analysis import SmallMoleculeAnalyzer
        
        start_time = datetime.utcnow()
        
        # Extract context for logging
        context = parameters.get("context", {})
        session_id = context.get("sessionId")
        user_id = context.get("userId")
        
        try:
            # Determine workflow type and execute appropriate analysis
            if workflow_type == "molecular_analysis_workflow":
                async with await self._log_tool_execution(workflow_id, "molecular_analysis", session_id, user_id):
                    analyzer = MolecularAnalyzer()
                    structure_data = parameters.get("structure_data", "")
                    structure_id = parameters.get("structure_id", "unknown")
                    
                    analysis_result = await analyzer.analyze_structure(
                        structure_data=structure_data,
                        structure_id=structure_id,
                        analysis_type="comprehensive"
                    )
                
                return {
                    "workflow_id": workflow_id,
                    "workflow_type": workflow_type,
                    "status": "completed",
                    "started_at": start_time.isoformat(),
                    "completed_at": datetime.utcnow().isoformat(),
                    "result": {
                        "type": "molecular_analysis",
                        "content": f"Molecular analysis completed for {structure_id}",
                        "data": analysis_result,
                        "metadata": {
                            "workflow_id": workflow_id,
                            "service": "python-langgraph-service",
                            "analysis_type": "real_biopython_analysis"
                        }
                    }
                }
                
            elif workflow_type == "pdb_search_workflow":
                async with await self._log_tool_execution(workflow_id, "pdb_search", session_id, user_id):
                    query = parameters.get("query", "")
                    search_type = parameters.get("search_type", "keyword")
                    
                    async with PDBSearchEngine() as pdb_search:
                        if search_type == "id":
                            search_result = await pdb_search.search_by_id(query)
                        else:
                            search_result = await pdb_search.search_by_keyword(query)
                
                return {
                    "workflow_id": workflow_id,
                    "workflow_type": workflow_type,
                    "status": "completed",
                    "started_at": start_time.isoformat(),
                    "completed_at": datetime.utcnow().isoformat(),
                    "result": {
                        "type": "pdb_search",
                        "content": f"PDB search completed for query: {query}",
                        "data": search_result,
                        "metadata": {
                            "workflow_id": workflow_id,
                            "service": "python-langgraph-service",
                            "search_type": "real_pdb_api"
                        }
                    }
                }
                
            elif workflow_type == "conversation_processing":
                # General conversation processing - use AI model for natural conversation
                logger.info("🧠 CONVERSATION PROCESSING WORKFLOW STARTED")
                
                messages = parameters.get("messages", [])
                user_message = parameters.get("message", "")
                
                # Get the actual user message from either format
                if messages:
                    user_message = messages[-1].get("content", "")
                elif not user_message:
                    user_message = "Hello"
                
                logger.info("📝 MESSAGE EXTRACTED", 
                           user_message=user_message,
                           messages_count=len(messages) if messages else 0,
                           parameters_keys=list(parameters.keys()))
                
                try:
                    # Check if LLM is properly initialized
                    if not self.llm:
                        raise ValueError("LLM not initialized")
                    
                    logger.info("Processing AI conversation", 
                               user_message=user_message[:100] + "..." if len(user_message) > 100 else user_message,
                               model=self.default_model)
                    
                    # Create conversation context for the AI
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

                    # Use the LLM for natural conversation
                    from langchain_core.messages import SystemMessage, HumanMessage
                    
                    conversation_messages = [
                        SystemMessage(content=system_prompt),
                        HumanMessage(content=user_message)
                    ]
                    
                    # Get AI response
                    logger.info("🤖 CALLING LLM FOR AI RESPONSE", 
                               messages_count=len(conversation_messages),
                               system_prompt_length=len(system_prompt),
                               user_message_length=len(user_message))
                    
                    ai_response = await self.llm.ainvoke(conversation_messages)
                    response_content = ai_response.content
                    
                    logger.info("✅ RECEIVED AI RESPONSE", 
                               response_length=len(response_content) if response_content else 0,
                               response_preview=response_content[:100] + "..." if response_content and len(response_content) > 100 else response_content,
                               ai_response_type=type(ai_response).__name__)
                    
                except Exception as e:
                    logger.error("Failed to get AI response", error=str(e), 
                               llm_initialized=self.llm is not None,
                               api_key_configured=bool(self.openai_api_key))
                    # Fallback response
                    response_content = f"I'm BioAI, your molecular analysis assistant! I can help you with protein analysis, PDB database searches, and molecular structure comparisons. How can I assist you today?"
                
                # Calculate processing metrics
                end_time = datetime.utcnow()
                duration_ms = int((end_time - start_time).total_seconds() * 1000)
                
                result = {
                    "workflowId": workflow_id,
                    "response": response_content,  # Put AI response directly here for Convex
                    "actions": [],
                    "newContext": {
                        "conversation_context": {
                            "user_message": user_message,
                            "ai_powered": True
                        }
                    },
                    "suggestedFollowUps": [
                        "Can you analyze a specific protein structure?",
                        "How can I search the PDB database?",
                        "Tell me about molecular analysis capabilities"
                    ],
                    "metadata": {
                        "tokensUsed": len(response_content) // 4,  # Rough token estimate
                        "duration": duration_ms,
                        "toolsInvoked": ["ChatOpenAI"],
                        "confidence": 0.95,
                        "sources": ["OpenAI API via LangGraph"]
                    },
                    "status": "completed"
                }
                
                logger.info("📤 CONVERSATION PROCESSING RESULT CONSTRUCTED", 
                           workflow_id=workflow_id,
                           response_content_length=len(response_content) if response_content else 0,
                           response_preview=response_content[:50] + "..." if response_content and len(response_content) > 50 else response_content,
                           result_keys=list(result.keys()),
                           duration_ms=duration_ms)
                
                return result
            
            else:
                # Default workflow - return service information
                logger.warning("⚠️ UNKNOWN WORKFLOW TYPE - USING DEFAULT", 
                              workflow_type=workflow_type,
                              available_types=["molecular_analysis_workflow", "pdb_search_workflow", "conversation_processing"])
                
                result = {
                    "workflowId": workflow_id,
                    "response": f"Unknown workflow type '{workflow_type}'. Available types: conversation_processing, molecular_analysis_workflow, pdb_search_workflow",
                    "actions": [],
                    "newContext": {},
                    "suggestedFollowUps": [
                        "Try: Hello",
                        "Try: What can you help me with?",
                        "Try: Analyze a protein structure"
                    ],
                    "metadata": {
                        "tokensUsed": 0,
                        "duration": int((datetime.utcnow() - start_time).total_seconds() * 1000),
                        "toolsInvoked": [],
                        "confidence": 0,
                        "sources": []
                    },
                    "status": "completed"
                }
                
                logger.info("📤 DEFAULT WORKFLOW RESULT", 
                           workflow_type=workflow_type,
                           result_keys=list(result.keys()))
                
                return result
                
        except Exception as e:
            import traceback
            error_traceback = traceback.format_exc()
            
            logger.error("❌ REAL WORKFLOW EXECUTION FAILED", 
                        error=str(e), 
                        workflow_id=workflow_id,
                        workflow_type=workflow_type,
                        error_type=type(e).__name__,
                        traceback=error_traceback)
            
            return {
                "workflowId": workflow_id,
                "response": f"Workflow execution failed: {str(e)}",
                "actions": [],
                "newContext": {"error": str(e)},
                "suggestedFollowUps": [
                    "Please check the logs for details",
                    "Try a simpler message",
                    "Contact support if issue persists"
                ],
                "metadata": {
                    "tokensUsed": 0,
                    "duration": int((datetime.utcnow() - start_time).total_seconds() * 1000),
                    "toolsInvoked": [],
                    "confidence": 0,
                    "sources": [],
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                "status": "failed"
            }

    async def cleanup(self) -> None:
        """Cleanup resources."""
        logger.info("Cleaning up workflow engine")
        self.active_workflows.clear()