from app.agents.langgraph_multi_agent_engine import LangGraphMultiAgentEngine, multi_agent_engine
from fastapi import HTTPException

# This will be set by main.py
workflow_engine: LangGraphMultiAgentEngine = None

def get_workflow_engine() -> LangGraphMultiAgentEngine:
    if workflow_engine is None:
        raise HTTPException(status_code=503, detail="Multi-agent workflow engine not initialized")
    return workflow_engine 