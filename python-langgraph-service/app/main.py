"""
FastAPI application for Python LangGraph microservice.
Provides molecular analysis capabilities using scientific computing libraries.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any

import structlog
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

from .config import get_settings
from .core.health import router as health_router
from .core.middleware import LoggingMiddleware, CorrelationIdMiddleware
from .agents.langgraph_multi_agent_engine import LangGraphMultiAgentEngine, multi_agent_engine
from .api.v1 import router as api_v1_router
import app.engine as engine

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management."""
    settings = get_settings()
    
    logger.info("Starting Python LangGraph microservice", version=app.version)
    
    try:
        # Initialize multi-agent workflow engine
        current_settings = get_settings()  # Use non-cached to get latest config
        if not current_settings.openai_api_key:
            logger.warning("No OpenAI API key found in environment or settings file")
        
        # Use the global multi-agent engine instance
        engine.workflow_engine = multi_agent_engine
        logger.info("LangGraph multi-agent workflow engine initialized successfully")
        
        yield
        
    except Exception as e:
        logger.error("Failed to initialize application", error=str(e))
        raise
    finally:
        # Cleanup
        if engine.workflow_engine:
            await engine.workflow_engine.cleanup()
        logger.info("Application shutdown complete")


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    settings = get_settings()
    
    app = FastAPI(
        title="Python LangGraph Microservice",
        description="Molecular analysis and AI orchestration service",
        version="0.1.0",
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        lifespan=lifespan,
    )
    
    # Add middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.allowed_hosts,
    )
    
    app.add_middleware(CorrelationIdMiddleware)
    app.add_middleware(LoggingMiddleware)
    
    # Include routers
    app.include_router(health_router, prefix="/health", tags=["health"])
    app.include_router(api_v1_router, prefix="/api/v1", tags=["api"])
    
    @app.get("/metrics")
    async def get_metrics():
        """Prometheus metrics endpoint."""
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
    
    @app.get("/")
    async def root():
        """Root endpoint with service information."""
        return {
            "service": "python-langgraph-service",
            "version": app.version,
            "status": "running",
            "docs_url": "/docs" if settings.debug else None,
            "settings_url": "/api/v1/settings/",
            "api_endpoints": {
                "settings": "/api/v1/settings/",
                "workflow": "/api/v1/workflow/",
                "molecular": "/api/v1/molecular/",
                "health": "/health/",
                "metrics": "/metrics"
            }
        }
    
    return app


# Create app instance
app = create_app()