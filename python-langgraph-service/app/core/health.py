"""
Health check endpoints for monitoring and orchestration.
"""

from datetime import datetime
from typing import Dict, Any

import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..config import get_settings

logger = structlog.get_logger(__name__)
router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    timestamp: datetime
    version: str
    service: str
    checks: Dict[str, Any]


class ReadinessResponse(BaseModel):
    """Readiness check response model."""
    ready: bool
    timestamp: datetime
    dependencies: Dict[str, str]


@router.get("/", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    Returns basic service health information.
    """
    settings = get_settings()
    
    # Basic health checks
    checks = {
        "service": "ok",
        "timestamp": datetime.utcnow().isoformat(),
    }
    
    try:
        # Add more health checks as needed
        # For now, just verify settings are loaded
        if settings.service_name:
            checks["configuration"] = "ok"
        else:
            checks["configuration"] = "error"
            
        return HealthResponse(
            status="healthy",
            timestamp=datetime.utcnow(),
            version="0.1.0",
            service=settings.service_name,
            checks=checks
        )
        
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        raise HTTPException(status_code=503, detail="Service unhealthy")


@router.get("/ready", response_model=ReadinessResponse)
async def readiness_check():
    """
    Readiness check endpoint.
    Verifies service is ready to handle requests.
    """
    settings = get_settings()
    dependencies = {}
    
    try:
        # Check OpenRouter/OpenAI API key is configured
        if settings.openai_api_key:
            dependencies["openai_api"] = "configured"
        else:
            dependencies["openai_api"] = "not_configured"
            
        # Check Redis connection (when implemented)
        dependencies["cache"] = "not_implemented"
        
        # Check if all critical dependencies are ready
        ready = all(
            status in ["configured", "connected", "not_implemented"]
            for status in dependencies.values()
        )
        
        return ReadinessResponse(
            ready=ready,
            timestamp=datetime.utcnow(),
            dependencies=dependencies
        )
        
    except Exception as e:
        logger.error("Readiness check failed", error=str(e))
        return ReadinessResponse(
            ready=False,
            timestamp=datetime.utcnow(),
            dependencies={"error": str(e)}
        )


@router.get("/live")
async def liveness_check():
    """
    Liveness check endpoint.
    Simple endpoint to verify service is running.
    """
    return {"alive": True, "timestamp": datetime.utcnow()}