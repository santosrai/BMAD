"""
OrchestrationAgent for coordinating multi-agent workflows.
Manages agent handoffs, parallel execution, and workflow coordination.
"""

from typing import Dict, Any, List, Optional, Set
from datetime import datetime
import asyncio

import structlog
from langchain_core.messages import HumanMessage, AIMessage

from .base_agent import BaseAgent, AgentType, AgentState, agent_registry

logger = structlog.get_logger(__name__)


class OrchestrationAgent(BaseAgent):
    """
    Agent responsible for coordinating multi-agent workflows.
    Manages agent routing, parallel execution, and result aggregation.
    """
    
    def __init__(
        self,
        agent_id: str = "orchestration_agent",
        config: Optional[Dict[str, Any]] = None
    ):
        super().__init__(agent_id, AgentType.ORCHESTRATION, config)
        self.workflow_definitions = self._load_workflow_definitions()
    
    def _load_workflow_definitions(self) -> Dict[str, Dict[str, Any]]:
        """Load predefined workflow patterns."""
        return {
            "structure_analysis_pipeline": {
                "description": "Complete structure analysis workflow",
                "steps": [
                    {"agent": "pdb_search_agent", "parallel": False},
                    {"agent": "molecular_analysis_agent", "parallel": False},
                    {"agent": "conversation_agent", "parallel": False}
                ],
                "triggers": ["analyze structure", "complete analysis", "full analysis"]
            },
            "structure_comparison": {
                "description": "Compare multiple protein structures",
                "steps": [
                    {"agent": "pdb_search_agent", "parallel": False},
                    {"agent": "molecular_analysis_agent", "parallel": True, "multiple": True},
                    {"agent": "structure_comparison_agent", "parallel": False},
                    {"agent": "conversation_agent", "parallel": False}
                ],
                "triggers": ["compare structures", "structure comparison", "compare proteins"]
            },
            "interactive_search": {
                "description": "Interactive search and display workflow", 
                "steps": [
                    {"agent": "conversation_agent", "parallel": False},
                    {"agent": "pdb_search_agent", "parallel": False},
                    {"agent": "conversation_agent", "parallel": False}
                ],
                "triggers": ["search", "find", "show", "display"]
            }
        }
    
    def can_handle(self, state: AgentState) -> bool:
        """Check if this agent should orchestrate the workflow."""
        # Handle if explicitly marked as orchestrated workflow
        if state.context.get("orchestrated_workflow"):
            return True
        
        # Handle complex workflows requiring multiple agents
        if self._detect_complex_workflow(state):
            return True
        
        # Handle if coming from agent handoff
        if state.next_agent == self.agent_id:
            return True
        
        # Handle workflow coordination requests
        if state.workflow_type in ["complex_analysis", "multi_agent_workflow"]:
            return True
        
        return False
    
    def _detect_complex_workflow(self, state: AgentState) -> bool:
        """Detect if request requires complex multi-agent workflow."""
        if not state.messages:
            return False
        
        last_message = state.messages[-1]
        if not isinstance(last_message, HumanMessage):
            return False
        
        message_content = last_message.content.lower()
        
        # Check for workflow trigger phrases
        for workflow_name, workflow_def in self.workflow_definitions.items():
            for trigger in workflow_def["triggers"]:
                if trigger in message_content:
                    return True
        
        # Check for complex analysis patterns
        complex_patterns = [
            "analyze and compare",
            "complete analysis of",
            "full analysis",
            "detailed analysis",
            "analyze multiple",
            "compare and analyze"
        ]
        
        return any(pattern in message_content for pattern in complex_patterns)
    
    async def execute(self, state: AgentState) -> Dict[str, Any]:
        """Execute workflow orchestration."""
        await self.pre_execute(state)
        
        try:
            # Determine workflow type
            workflow_plan = self._plan_workflow(state)
            
            # Execute workflow
            workflow_results = await self._execute_workflow(workflow_plan, state)
            
            # Aggregate results
            final_result = self._aggregate_results(workflow_results, state)
            
            # Generate summary response
            summary_message = self._generate_workflow_summary(workflow_results, workflow_plan)
            
            result = {
                **state.dict(),
                "messages": state.messages + [AIMessage(content=summary_message["content"])],
                "current_agent": self.agent_id,
                "context": {
                    **state.context,
                    "orchestrated_workflow": True,
                    "workflow_plan": workflow_plan,
                    "workflow_results": workflow_results
                },
                "analysis_results": {
                    **state.analysis_results,
                    "orchestration_summary": final_result
                },
                "completed_at": datetime.utcnow()
            }
            
            await self.post_execute(state, result)
            return result
            
        except Exception as e:
            error_msg = f"Workflow orchestration failed: {str(e)}"
            self.logger.error("Orchestration execution failed", error=str(e))
            
            result = {
                **state.dict(),
                "error_state": error_msg,
                "current_agent": self.agent_id,
                "messages": state.messages + [AIMessage(content=f"Workflow failed: {str(e)}")]
            }
            
            await self.post_execute(state, result)
            return result
    
    def _plan_workflow(self, state: AgentState) -> Dict[str, Any]:
        """Plan the workflow execution based on current state."""
        workflow_plan = {
            "workflow_type": "custom",
            "steps": [],
            "parallel_groups": [],
            "estimated_duration": 0
        }
        
        # Try to match predefined workflows
        matched_workflow = self._match_predefined_workflow(state)
        if matched_workflow:
            workflow_plan.update(matched_workflow)
            self.logger.info("Using predefined workflow", workflow_type=matched_workflow["workflow_type"])
        else:
            # Create custom workflow based on state analysis
            workflow_plan = self._create_custom_workflow(state)
            self.logger.info("Created custom workflow", steps=len(workflow_plan["steps"]))
        
        return workflow_plan
    
    def _match_predefined_workflow(self, state: AgentState) -> Optional[Dict[str, Any]]:
        """Try to match state to predefined workflow patterns."""
        if not state.messages:
            return None
        
        last_message = state.messages[-1]
        if not isinstance(last_message, HumanMessage):
            return None
        
        message_content = last_message.content.lower()
        
        for workflow_name, workflow_def in self.workflow_definitions.items():
            for trigger in workflow_def["triggers"]:
                if trigger in message_content:
                    return {
                        "workflow_type": workflow_name,
                        "description": workflow_def["description"],
                        "steps": workflow_def["steps"]
                    }
        
        return None
    
    def _create_custom_workflow(self, state: AgentState) -> Dict[str, Any]:
        """Create custom workflow based on state analysis."""
        steps = []
        
        # Always start with conversation for intent clarification if not clear
        if not state.context.get("intent_analysis"):
            steps.append({"agent": "conversation_agent", "parallel": False, "purpose": "intent_analysis"})
        
        # Add PDB search if structure requests detected
        if self._needs_pdb_search(state):
            steps.append({"agent": "pdb_search_agent", "parallel": False, "purpose": "structure_retrieval"})
        
        # Add molecular analysis if analysis requested
        if self._needs_molecular_analysis(state):
            steps.append({"agent": "molecular_analysis_agent", "parallel": False, "purpose": "structure_analysis"})
        
        # End with conversation for result presentation
        steps.append({"agent": "conversation_agent", "parallel": False, "purpose": "result_presentation"})
        
        return {
            "workflow_type": "custom",
            "description": "Custom workflow based on request analysis",
            "steps": steps
        }
    
    def _needs_pdb_search(self, state: AgentState) -> bool:
        """Check if workflow needs PDB search."""
        # Check for PDB IDs or protein names in messages
        if state.messages:
            last_message = state.messages[-1]
            if isinstance(last_message, HumanMessage):
                message_content = last_message.content.lower()
                
                # PDB patterns
                import re
                pdb_pattern = r'\b([1-9][A-Z0-9]{3})\b'
                if re.search(pdb_pattern, message_content.upper()):
                    return True
                
                # Structure keywords
                structure_keywords = ["structure", "protein", "pdb", "show", "display", "load"]
                if any(keyword in message_content for keyword in structure_keywords):
                    return True
        
        return False
    
    def _needs_molecular_analysis(self, state: AgentState) -> bool:
        """Check if workflow needs molecular analysis."""
        if state.messages:
            last_message = state.messages[-1]
            if isinstance(last_message, HumanMessage):
                message_content = last_message.content.lower()
                
                analysis_keywords = [
                    "analyze", "analysis", "binding", "active site", "properties",
                    "secondary structure", "hydrogen bonds", "molecular weight"
                ]
                if any(keyword in message_content for keyword in analysis_keywords):
                    return True
        
        return False
    
    async def _execute_workflow(self, workflow_plan: Dict[str, Any], state: AgentState) -> List[Dict[str, Any]]:
        """Execute the planned workflow."""
        workflow_results = []
        current_state = state
        
        self.logger.info("Starting workflow execution", 
                        workflow_type=workflow_plan["workflow_type"],
                        total_steps=len(workflow_plan["steps"]))
        
        for i, step in enumerate(workflow_plan["steps"]):
            step_start_time = datetime.utcnow()
            
            try:
                self.logger.info(f"Executing workflow step {i+1}/{len(workflow_plan['steps'])}", 
                               agent=step["agent"], 
                               purpose=step.get("purpose", "unknown"))
                
                # Get the agent
                agent = agent_registry.get_agent(step["agent"])
                if not agent:
                    raise ValueError(f"Agent not found: {step['agent']}")
                
                # Check if agent can handle current state
                if not agent.can_handle(current_state):
                    self.logger.warning("Agent cannot handle current state", 
                                      agent=step["agent"], 
                                      step=i+1)
                    continue
                
                # Execute agent
                step_result = await agent.execute(current_state)
                
                # Update current state for next step
                current_state = AgentState(**step_result)
                
                # Record step result
                step_duration = (datetime.utcnow() - step_start_time).total_seconds()
                workflow_results.append({
                    "step": i + 1,
                    "agent": step["agent"],
                    "purpose": step.get("purpose"),
                    "duration": step_duration,
                    "success": not step_result.get("error_state"),
                    "result": step_result,
                    "timestamp": step_start_time.isoformat()
                })
                
                self.logger.info(f"Completed workflow step {i+1}", 
                               agent=step["agent"], 
                               duration=step_duration,
                               success=not step_result.get("error_state"))
                
                # If step failed, decide whether to continue
                if step_result.get("error_state"):
                    self.logger.warning("Workflow step failed, continuing", 
                                      step=i+1, 
                                      error=step_result["error_state"])
                
            except Exception as e:
                step_duration = (datetime.utcnow() - step_start_time).total_seconds()
                self.logger.error(f"Workflow step {i+1} failed", 
                                agent=step["agent"], 
                                error=str(e))
                
                workflow_results.append({
                    "step": i + 1,
                    "agent": step["agent"],
                    "purpose": step.get("purpose"),
                    "duration": step_duration,
                    "success": False,
                    "error": str(e),
                    "timestamp": step_start_time.isoformat()
                })
        
        return workflow_results
    
    def _aggregate_results(self, workflow_results: List[Dict[str, Any]], state: AgentState) -> Dict[str, Any]:
        """Aggregate results from all workflow steps."""
        aggregated = {
            "total_steps": len(workflow_results),
            "successful_steps": sum(1 for result in workflow_results if result["success"]),
            "failed_steps": sum(1 for result in workflow_results if not result["success"]),
            "total_duration": sum(result["duration"] for result in workflow_results),
            "agents_involved": list(set(result["agent"] for result in workflow_results)),
            "workflow_success": all(result["success"] for result in workflow_results)
        }
        
        # Extract key results by agent type
        aggregated["results_by_agent"] = {}
        for result in workflow_results:
            if result["success"] and "result" in result:
                agent_type = result["agent"]
                aggregated["results_by_agent"][agent_type] = {
                    "duration": result["duration"],
                    "key_data": self._extract_key_data(result["result"], agent_type)
                }
        
        return aggregated
    
    def _extract_key_data(self, agent_result: Dict[str, Any], agent_type: str) -> Dict[str, Any]:
        """Extract key data from agent results."""
        key_data = {}
        
        if agent_type == "pdb_search_agent":
            search_results = agent_result.get("search_results", {}).get(agent_type, {})
            structures = search_results.get("structures_found", [])
            key_data = {
                "structures_found": len(structures),
                "structure_ids": [s.get("pdb_id") for s in structures if s.get("pdb_id")]
            }
        
        elif agent_type == "molecular_analysis_agent":
            analysis_results = agent_result.get("analysis_results", {}).get(agent_type, {})
            key_data = {
                "analysis_type": analysis_results.get("analysis_type"),
                "structure_id": analysis_results.get("structure_id"),
                "status": analysis_results.get("status")
            }
            
            # Extract basic properties if available
            if "basic_properties" in analysis_results:
                props = analysis_results["basic_properties"]
                key_data["basic_properties"] = {
                    "chains": props.get("chain_count", 0),
                    "residues": props.get("total_residues", 0),
                    "atoms": props.get("total_atoms", 0)
                }
        
        elif agent_type == "conversation_agent":
            key_data = {
                "response_generated": bool(agent_result.get("messages")),
                "intent_analyzed": bool(agent_result.get("context", {}).get("intent_analysis"))
            }
        
        return key_data
    
    def _generate_workflow_summary(self, workflow_results: List[Dict[str, Any]], workflow_plan: Dict[str, Any]) -> Dict[str, Any]:
        """Generate human-readable workflow summary."""
        successful_steps = sum(1 for result in workflow_results if result["success"])
        total_steps = len(workflow_results)
        total_duration = sum(result["duration"] for result in workflow_results)
        
        if successful_steps == total_steps:
            content = f"✅ **Workflow Completed Successfully**\n\n"
            content += f"**{workflow_plan.get('description', 'Custom workflow')}**\n\n"
            content += f"**Execution Summary:**\n"
            content += f"• Steps completed: {successful_steps}/{total_steps}\n"
            content += f"• Total duration: {total_duration:.2f} seconds\n"
            content += f"• Agents involved: {len(set(result['agent'] for result in workflow_results))}\n\n"
            
            # Add specific results
            agents_involved = set(result["agent"] for result in workflow_results if result["success"])
            if "pdb_search_agent" in agents_involved:
                content += "🔍 Structure search completed\n"
            if "molecular_analysis_agent" in agents_involved:
                content += "🧬 Molecular analysis completed\n"
            
            content += "\nAll workflow components executed successfully!"
            
        else:
            content = f"⚠️ **Workflow Partially Completed**\n\n"
            content += f"**{workflow_plan.get('description', 'Custom workflow')}**\n\n"
            content += f"**Execution Summary:**\n"
            content += f"• Steps completed: {successful_steps}/{total_steps}\n"
            content += f"• Failed steps: {total_steps - successful_steps}\n"
            content += f"• Total duration: {total_duration:.2f} seconds\n\n"
            
            # List failed steps
            failed_steps = [result for result in workflow_results if not result["success"]]
            if failed_steps:
                content += "**Failed Steps:**\n"
                for failed_step in failed_steps:
                    content += f"• Step {failed_step['step']}: {failed_step['agent']} - {failed_step.get('error', 'Unknown error')}\n"
        
        return {
            "content": content,
            "type": "workflow_summary"
        }


# Register the orchestration agent globally
orchestration_agent = OrchestrationAgent()
agent_registry.register_agent(orchestration_agent)