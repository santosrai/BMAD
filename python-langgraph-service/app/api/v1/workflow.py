"""
Workflow execution endpoints.
Compatible with the existing Convex langgraphWorkflow.ts interface.
"""

from typing import Dict, Any, Optional
import uuid
import time
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field

from ...agents.langgraph_multi_agent_engine import LangGraphMultiAgentEngine
from ...core.chat_logger import get_chat_logger
from app.engine import get_workflow_engine

logger = structlog.get_logger(__name__)
router = APIRouter()


class WorkflowExecuteRequest(BaseModel):
    """Request model for workflow execution."""
    workflowType: str = Field(..., description="Type of workflow to execute")
    parameters: Dict[str, Any] = Field(..., description="Workflow parameters")
    apiKey: Optional[str] = Field(None, description="API key override")


class WorkflowExecuteResponse(BaseModel):
    """Response model for workflow execution."""
    workflow_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    started_at: str
    completed_at: Optional[str] = None


class WorkflowStatusResponse(BaseModel):
    """Response model for workflow status."""
    workflow_id: str
    status: str
    current_step: Optional[str] = None
    started_at: Optional[str] = None
    error: Optional[str] = None


@router.post("/execute", response_model=WorkflowExecuteResponse)
async def execute_workflow(
    request: WorkflowExecuteRequest,
    workflow_engine: LangGraphMultiAgentEngine = Depends(get_workflow_engine)
):
    """
    Execute a LangGraph workflow.
    
    This endpoint provides the same interface as the TypeScript version
    in convex/langgraphWorkflow.ts but uses Python LangGraph implementation.
    """
    workflow_id = str(uuid.uuid4())
    chat_logger = get_chat_logger()
    start_time = time.time()
    
    # Extract context information from parameters
    context = request.parameters.get("context", {})
    user_id = context.get("userId")
    session_id = context.get("sessionId")
    user_message = request.parameters.get("message", "")
    
    # Log workflow start
    chat_logger.log_workflow_start(
        workflow_id=workflow_id,
        workflow_type=request.workflowType,
        parameters=request.parameters,
        session_id=session_id,
        user_id=user_id
    )
    
    # Log user message if present
    if user_message:
        chat_logger.log_user_message(
            workflow_id=workflow_id,
            message=user_message,
            session_id=session_id,
            user_id=user_id,
            metadata={
                "workflow_type": request.workflowType,
                "has_api_key": bool(request.apiKey)
            }
        )
    
    logger.info(
        "Workflow execution requested",
        workflow_type=request.workflowType,
        workflow_id=workflow_id,
        user_id=user_id,
        session_id=session_id,
        has_api_key=bool(request.apiKey)
    )
    
    try:
        # Execute workflow
        result = await workflow_engine.execute_workflow(
            workflow_type=request.workflowType,
            parameters=request.parameters,
            workflow_id=workflow_id
        )
        
        duration_ms = (time.time() - start_time) * 1000
        
        # Extract response and metrics from result
        ai_response = result.get("response", "")  # Fixed: use 'response' instead of 'content'
        tokens_used = result.get("metadata", {}).get("tokensUsed", 0)
        tools_invoked = result.get("metadata", {}).get("toolsInvoked", [])
        
        logger.info("Workflow result received", 
                   workflow_id=workflow_id,
                   has_response=bool(ai_response),
                   response_length=len(ai_response) if ai_response else 0,
                   result_keys=list(result.keys()) if result else [])
        
        # Log AI response
        if ai_response:
            chat_logger.log_ai_response(
                workflow_id=workflow_id,
                response=ai_response,
                session_id=session_id,
                user_id=user_id,
                duration_ms=duration_ms,
                tokens_used=tokens_used,
                tools_invoked=tools_invoked,
                metadata=result.get("metadata", {})
            )
        
        # Log workflow completion
        chat_logger.log_workflow_complete(
            workflow_id=workflow_id,
            workflow_type=request.workflowType,
            duration_ms=duration_ms,
            tokens_used=tokens_used,
            tools_invoked=tools_invoked,
            session_id=session_id,
            user_id=user_id,
            metadata={
                "result_status": "success",
                "response_length": len(ai_response) if ai_response else 0
            }
        )
        
        response_data = WorkflowExecuteResponse(
            workflow_id=workflow_id,
            status="completed",
            result=result,
            started_at=result.get("started_at", ""),
            completed_at=result.get("completed_at")
        )
        
        logger.info("Returning workflow response", 
                   workflow_id=workflow_id,
                   response_data=response_data.dict())
                   
        return response_data
        
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        error_msg = str(e)
        
        # Log workflow error
        chat_logger.log_workflow_error(
            workflow_id=workflow_id,
            workflow_type=request.workflowType,
            error=error_msg,
            duration_ms=duration_ms,
            session_id=session_id,
            user_id=user_id,
            metadata={
                "error_type": type(e).__name__,
                "has_api_key": bool(request.apiKey)
            }
        )
        
        logger.error(
            "Workflow execution failed",
            workflow_type=request.workflowType,
            workflow_id=workflow_id,
            user_id=user_id,
            session_id=session_id,
            error=error_msg,
            duration_ms=duration_ms
        )
        
        return WorkflowExecuteResponse(
            workflow_id=workflow_id,
            status="error",
            error=error_msg,
            started_at="",
        )


@router.get("/status/{workflow_id}", response_model=WorkflowStatusResponse)
async def get_workflow_status(
    workflow_id: str,
    workflow_engine: LangGraphMultiAgentEngine = Depends(get_workflow_engine)
):
    """
    Get status of a running workflow.
    """
    logger.info("Workflow status requested", workflow_id=workflow_id)
    
    try:
        status = await workflow_engine.get_workflow_status(workflow_id)
        
        if not status:
            raise HTTPException(
                status_code=404,
                detail=f"Workflow {workflow_id} not found"
            )
        
        return WorkflowStatusResponse(**status)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get workflow status",
            workflow_id=workflow_id,
            error=str(e)
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get workflow status: {str(e)}"
        )


@router.post("/stop/{workflow_id}")
async def stop_workflow(
    workflow_id: str,
    workflow_engine: LangGraphMultiAgentEngine = Depends(get_workflow_engine)
):
    """
    Stop a running workflow.
    """
    logger.info("Workflow stop requested", workflow_id=workflow_id)
    
    try:
        success = await workflow_engine.stop_workflow(workflow_id)
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"Workflow {workflow_id} not found or already stopped"
            )
        
        return {
            "workflow_id": workflow_id,
            "status": "stopped",
            "message": "Workflow stopped successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to stop workflow",
            workflow_id=workflow_id,
            error=str(e)
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to stop workflow: {str(e)}"
        )


@router.get("/history")
async def get_workflow_history():
    """
    Get workflow execution history.
    Placeholder for future implementation.
    """
    return {
        "message": "Workflow history endpoint - to be implemented",
        "workflows": []
    }


@router.get("/logs/conversation/{session_id}")
async def get_conversation_logs(
    session_id: str,
    limit: int = 50
):
    """
    Get conversation logs for a specific session.
    
    Args:
        session_id: Session ID to filter by
        limit: Maximum number of messages to return
        
    Returns:
        List of conversation events for the session
    """
    chat_logger = get_chat_logger()
    
    try:
        conversations = chat_logger.get_conversation_history(
            session_id=session_id,
            limit=limit
        )
        
        return {
            "session_id": session_id,
            "conversation_count": len(conversations),
            "conversations": conversations
        }
        
    except Exception as e:
        logger.error("Failed to retrieve conversation logs", session_id=session_id, error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve conversation logs: {str(e)}"
        )


@router.get("/logs/analytics")
async def get_analytics_summary(days: int = 7):
    """
    Get analytics summary for chat interactions.
    
    Args:
        days: Number of days to analyze (default: 7)
        
    Returns:
        Analytics summary with metrics
    """
    chat_logger = get_chat_logger()
    
    try:
        analytics = chat_logger.get_analytics_summary(days=days)
        
        return {
            "period_days": days,
            "analytics": analytics,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to generate analytics summary", days=days, error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate analytics summary: {str(e)}"
        )


@router.get("/logs/recent")
async def get_recent_chats(limit: int = 20):
    """
    Get recent chat interactions across all sessions.
    
    Args:
        limit: Maximum number of recent chats to return
        
    Returns:
        List of recent chat events
    """
    chat_logger = get_chat_logger()
    
    try:
        # This is a simple implementation - in production you might want
        # to implement a more efficient way to get recent chats
        recent_chats = []
        
        return {
            "limit": limit,
            "recent_chats": recent_chats,
            "message": "Recent chats endpoint - basic implementation"
        }
        
    except Exception as e:
        logger.error("Failed to retrieve recent chats", limit=limit, error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve recent chats: {str(e)}"
        )