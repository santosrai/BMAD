from app.agents.langgraph_engine import LangGraphWorkflowEngine
from fastapi import HTTPException

# This will be set by main.py
workflow_engine: LangGraphWorkflowEngine = None

def get_workflow_engine() -> LangGraphWorkflowEngine:
    if workflow_engine is None:
        raise HTTPException(status_code=503, detail="Workflow engine not initialized")
    return workflow_engine 