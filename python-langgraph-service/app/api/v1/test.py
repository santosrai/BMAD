"""
Test endpoints for debugging the AI workflow system.
"""

import structlog
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from ...agents.langgraph_multi_agent_engine import LangGraphMultiAgentEngine
from ...config import get_settings
from app.engine import get_workflow_engine

logger = structlog.get_logger(__name__)
router = APIRouter()


class TestAIRequest(BaseModel):
    """Request model for AI test."""
    message: str = Field(default="Hello", description="Test message")


@router.post("/ai")
async def test_ai_call(
    request: TestAIRequest,
    workflow_engine: LangGraphMultiAgentEngine = Depends(get_workflow_engine)
):
    """
    Test the AI call directly to isolate issues.
    """
    logger.info("🧪 TESTING AI CALL DIRECTLY", message=request.message)
    
    try:
        # Check configuration
        settings = get_settings()
        
        config_info = {
            "api_key_present": bool(settings.openai_api_key),
            "api_key_preview": settings.openai_api_key[:10] + "..." if settings.openai_api_key else "None",
            "base_url": settings.openai_base_url,
            "model": settings.default_model,
            "multi_agent_system": True,
            "agents_registered": len(workflow_engine.agents)
        }
        
        logger.info("🔧 CONFIG CHECK", **config_info)
        
        if not settings.openai_api_key:
            raise ValueError("API key not configured")
        
        # Test workflow execution instead of direct LLM call
        logger.info("🤖 TESTING MULTI-AGENT WORKFLOW")
        response = await workflow_engine.execute_workflow(
            workflow_type="conversation_processing",
            parameters={"message": request.message}
        )
        
        result = {
            "success": True,
            "config": config_info,
            "request_message": request.message,
            "workflow_response": response.get("response", ""),
            "workflow_status": response.get("status", "unknown"),
            "agents_involved": response.get("metadata", {}).get("toolsInvoked", []),
            "execution_time": response.get("metadata", {}).get("duration", 0)
        }
        
        logger.info("✅ MULTI-AGENT WORKFLOW SUCCESS", 
                   execution_time=response.get("metadata", {}).get("duration", 0),
                   agents_involved=response.get("metadata", {}).get("toolsInvoked", []))
        
        return result
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        
        logger.error("❌ AI CALL FAILED", 
                    error=str(e),
                    error_type=type(e).__name__,
                    traceback=error_traceback)
        
        return {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__,
            "config": config_info if 'config_info' in locals() else {},
            "traceback": error_traceback
        }


@router.get("/config")
async def test_config():
    """
    Test configuration loading.
    """
    try:
        settings = get_settings()
        
        return {
            "success": True,
            "config": {
                "api_key_present": bool(settings.openai_api_key),
                "api_key_preview": settings.openai_api_key[:10] + "..." if settings.openai_api_key else "None",
                "base_url": settings.openai_base_url,
                "model": settings.default_model,
                "service_name": settings.service_name,
                "debug": settings.debug
            },
            "config_file_check": "API key loaded from settings file" if settings.openai_api_key else "No API key found"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__
        }


@router.post("/workflow")
async def test_workflow_execution(
    request: TestAIRequest,
    workflow_engine: LangGraphMultiAgentEngine = Depends(get_workflow_engine)
):
    """
    Test full workflow execution to see the complete flow.
    """
    logger.info("🧪 TESTING FULL WORKFLOW EXECUTION")
    
    try:
        result = await workflow_engine.execute_workflow(
            workflow_type="conversation_processing",
            parameters={"message": request.message},
            workflow_id="test_workflow_123"
        )
        
        logger.info("✅ WORKFLOW TEST SUCCESS", 
                   result_keys=list(result.keys()) if result else [],
                   has_response=bool(result.get("response")) if result else False)
        
        return {
            "success": True,
            "workflow_result": result,
            "result_analysis": {
                "has_response": bool(result.get("response")) if result else False,
                "response_length": len(result.get("response", "")) if result else 0,
                "result_keys": list(result.keys()) if result else [],
                "workflow_id": result.get("workflowId") if result else None,
                "status": result.get("status") if result else None
            }
        }
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        
        logger.error("❌ WORKFLOW TEST FAILED", 
                    error=str(e),
                    error_type=type(e).__name__,
                    traceback=error_traceback)
        
        return {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__,
            "traceback": error_traceback
        }