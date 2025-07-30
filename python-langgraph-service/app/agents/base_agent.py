"""
Base agent class for LangGraph multi-agent system.
Defines common interfaces and functionality for all specialized agents.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
from enum import Enum

import structlog
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph
from langchain_core.messages import BaseMessage

logger = structlog.get_logger(__name__)


class AgentType(str, Enum):
    """Types of agents in the system."""
    CONVERSATION = "conversation"
    MOLECULAR_ANALYSIS = "molecular_analysis"
    PDB_SEARCH = "pdb_search"
    VISUALIZATION = "visualization"
    ORCHESTRATION = "orchestration"


class AgentState(BaseModel):
    """Shared state between all agents in the multi-agent system."""
    messages: List[BaseMessage] = Field(default_factory=list)
    current_agent: str = ""
    workflow_id: str = ""
    workflow_type: str = ""
    context: Dict[str, Any] = Field(default_factory=dict)
    parameters: Dict[str, Any] = Field(default_factory=dict)
    
    # Domain-specific data
    molecular_data: Dict[str, Any] = Field(default_factory=dict)
    search_results: Dict[str, Any] = Field(default_factory=dict)
    analysis_results: Dict[str, Any] = Field(default_factory=dict)
    visualization_commands: List[Dict] = Field(default_factory=list)
    
    # Workflow management
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_state: Optional[str] = None
    next_agent: Optional[str] = None
    
    # Agent coordination
    agent_handoffs: List[Dict[str, Any]] = Field(default_factory=list)
    parallel_results: Dict[str, Any] = Field(default_factory=dict)


class AgentResult(BaseModel):
    """Result from an agent execution."""
    agent_type: AgentType
    agent_id: str
    success: bool
    data: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None
    next_agent: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BaseAgent(ABC):
    """
    Abstract base class for all agents in the LangGraph multi-agent system.
    Provides common functionality and enforces consistent interfaces.
    """
    
    def __init__(
        self,
        agent_id: str,
        agent_type: AgentType,
        config: Optional[Dict[str, Any]] = None
    ):
        self.agent_id = agent_id
        self.agent_type = agent_type
        self.config = config or {}
        self.logger = structlog.get_logger(f"{__name__}.{agent_id}")
        
    @abstractmethod
    async def execute(self, state: AgentState) -> Dict[str, Any]:
        """
        Execute the agent's main functionality.
        
        Args:
            state: Current agent state
            
        Returns:
            Updated state dictionary
        """
        pass
    
    @abstractmethod
    def can_handle(self, state: AgentState) -> bool:
        """
        Determine if this agent can handle the current state/request.
        
        Args:
            state: Current agent state
            
        Returns:
            True if agent can handle the request
        """
        pass
    
    async def pre_execute(self, state: AgentState) -> None:
        """Hook called before execute(). Override for setup logic."""
        self.logger.info(
            "Agent starting execution",
            agent_id=self.agent_id,
            agent_type=self.agent_type.value,
            workflow_id=state.workflow_id
        )
    
    async def post_execute(self, state: AgentState, result: Dict[str, Any]) -> None:
        """Hook called after execute(). Override for cleanup logic."""
        success = not result.get("error")
        self.logger.info(
            "Agent completed execution",
            agent_id=self.agent_id,
            agent_type=self.agent_type.value,
            workflow_id=state.workflow_id,
            success=success
        )
    
    def create_result(
        self,
        success: bool,
        data: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
        next_agent: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AgentResult:
        """Helper to create standardized agent results."""
        return AgentResult(
            agent_type=self.agent_type,
            agent_id=self.agent_id,
            success=success,
            data=data or {},
            error=error,
            next_agent=next_agent,
            metadata=metadata or {}
        )
    
    def log_agent_handoff(self, from_agent: str, to_agent: str, reason: str) -> Dict[str, Any]:
        """Log and return agent handoff information."""
        handoff = {
            "from_agent": from_agent,
            "to_agent": to_agent,
            "reason": reason,
            "timestamp": datetime.utcnow().isoformat()
        }
        self.logger.info("Agent handoff", **handoff)
        return handoff


class AgentRegistry:
    """Registry for managing and routing between agents."""
    
    def __init__(self):
        self._agents: Dict[str, BaseAgent] = {}
        self._agent_types: Dict[AgentType, List[str]] = {}
    
    def register_agent(self, agent: BaseAgent) -> None:
        """Register an agent in the system."""
        self._agents[agent.agent_id] = agent
        
        if agent.agent_type not in self._agent_types:
            self._agent_types[agent.agent_type] = []
        self._agent_types[agent.agent_type].append(agent.agent_id)
        
        logger.info(
            "Agent registered",
            agent_id=agent.agent_id,
            agent_type=agent.agent_type.value
        )
    
    def get_agent(self, agent_id: str) -> Optional[BaseAgent]:
        """Get agent by ID."""
        return self._agents.get(agent_id)
    
    def get_agents_by_type(self, agent_type: AgentType) -> List[BaseAgent]:
        """Get all agents of a specific type."""
        agent_ids = self._agent_types.get(agent_type, [])
        return [self._agents[agent_id] for agent_id in agent_ids]
    
    def find_capable_agent(self, state: AgentState) -> Optional[BaseAgent]:
        """Find the first agent that can handle the current state."""
        for agent in self._agents.values():
            if agent.can_handle(state):
                return agent
        return None
    
    def list_agents(self) -> Dict[str, Dict[str, Any]]:
        """List all registered agents with their metadata."""
        return {
            agent_id: {
                "agent_type": agent.agent_type.value,
                "config": agent.config
            }
            for agent_id, agent in self._agents.items()
        }


# Global agent registry instance
agent_registry = AgentRegistry()