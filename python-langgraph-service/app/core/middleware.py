"""
FastAPI middleware for logging, correlation IDs, and request processing.
"""

import time
import uuid
from typing import Callable

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = structlog.get_logger(__name__)


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Add correlation ID to requests for tracing."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate or extract correlation ID
        correlation_id = request.headers.get("x-correlation-id") or str(uuid.uuid4())
        
        # Add to request state
        request.state.correlation_id = correlation_id
        
        # Process request
        response = await call_next(request)
        
        # Add correlation ID to response headers
        response.headers["x-correlation-id"] = correlation_id
        
        return response


class LoggingMiddleware(BaseHTTPMiddleware):
    """Log HTTP requests and responses with structured logging."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        correlation_id = getattr(request.state, "correlation_id", "unknown")
        
        # Log request
        logger.info(
            "HTTP request started",
            method=request.method,
            url=str(request.url),
            correlation_id=correlation_id,
            client_ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Log response
            logger.info(
                "HTTP request completed",
                method=request.method,
                url=str(request.url),
                status_code=response.status_code,
                duration_ms=round(duration * 1000, 2),
                correlation_id=correlation_id,
            )
            
            # Add performance headers
            response.headers["x-response-time"] = str(round(duration * 1000, 2))
            
            return response
            
        except Exception as e:
            duration = time.time() - start_time
            
            logger.error(
                "HTTP request failed",
                method=request.method,
                url=str(request.url),
                duration_ms=round(duration * 1000, 2),
                correlation_id=correlation_id,
                error=str(e),
                error_type=type(e).__name__,
            )
            raise