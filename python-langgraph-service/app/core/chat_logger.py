"""
Chat Logging Module for Python LangGraph Microservice.
Provides comprehensive logging for user chat interactions, including
conversation tracking, analytics, and debugging information.
"""

import json
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from enum import Enum

import structlog
from pydantic import BaseModel

logger = structlog.get_logger(__name__)


class ChatEventType(str, Enum):
    """Types of chat events to log."""
    USER_MESSAGE = "user_message"
    AI_RESPONSE = "ai_response"  
    WORKFLOW_START = "workflow_start"
    WORKFLOW_COMPLETE = "workflow_complete"
    WORKFLOW_ERROR = "workflow_error"
    TOOL_EXECUTION = "tool_execution"
    CONTEXT_UPDATE = "context_update"


class LogLevel(str, Enum):
    """Log levels for chat events."""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


@dataclass
class ChatEvent:
    """Structured chat event for logging."""
    timestamp: datetime
    event_type: ChatEventType
    level: LogLevel
    workflow_id: str
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    message: Optional[str] = None
    response: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    duration_ms: Optional[float] = None
    tokens_used: Optional[int] = None
    tools_invoked: Optional[List[str]] = None


class ChatLogger:
    """
    Comprehensive chat logging system for the Python microservice.
    
    Features:
    - Structured logging with JSON output
    - File-based conversation logs
    - Performance metrics tracking
    - Error and debugging information
    - User interaction analytics
    """
    
    def __init__(self, log_dir: str = "logs", max_file_size_mb: int = 100):
        """
        Initialize chat logger.
        
        Args:
            log_dir: Directory to store log files
            max_file_size_mb: Maximum size of individual log files in MB
        """
        self.log_dir = Path(log_dir)
        self.max_file_size = max_file_size_mb * 1024 * 1024  # Convert to bytes
        self.logger = structlog.get_logger("chat_logger")
        
        # Create log directories
        self.log_dir.mkdir(exist_ok=True)
        (self.log_dir / "conversations").mkdir(exist_ok=True)
        (self.log_dir / "errors").mkdir(exist_ok=True)
        (self.log_dir / "analytics").mkdir(exist_ok=True)
        
        self.logger.info("Chat logger initialized", log_dir=str(self.log_dir))

    def log_chat_event(self, event: ChatEvent):
        """
        Log a chat event with structured logging.
        
        Args:
            event: ChatEvent to log
        """
        # Structure the log data
        log_data = {
            "timestamp": event.timestamp.isoformat(),
            "event_type": event.event_type,
            "level": event.level,
            "workflow_id": event.workflow_id,
            "session_id": event.session_id,
            "user_id": event.user_id,
            "duration_ms": event.duration_ms,
            "tokens_used": event.tokens_used,
            "tools_invoked": event.tools_invoked or [],
            "metadata": event.metadata or {}
        }
        
        # Add message/response/error based on event type
        if event.message:
            log_data["message"] = event.message
        if event.response:
            log_data["response"] = event.response
        if event.error:
            log_data["error"] = event.error
        
        # Log to structured logger
        if event.level == LogLevel.ERROR:
            self.logger.error("Chat event", **log_data)
        elif event.level == LogLevel.WARNING:
            self.logger.warning("Chat event", **log_data)
        elif event.level == LogLevel.DEBUG:
            self.logger.debug("Chat event", **log_data)
        else:
            self.logger.info("Chat event", **log_data)
        
        # Also write to file-based logs
        self._write_to_file(event, log_data)

    def log_user_message(
        self,
        workflow_id: str,
        message: str,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log a user message."""
        event = ChatEvent(
            timestamp=datetime.now(timezone.utc),
            event_type=ChatEventType.USER_MESSAGE,
            level=LogLevel.INFO,
            workflow_id=workflow_id,
            session_id=session_id,
            user_id=user_id,
            message=message,
            metadata=metadata
        )
        self.log_chat_event(event)

    def log_ai_response(
        self,
        workflow_id: str,
        response: str,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        duration_ms: Optional[float] = None,
        tokens_used: Optional[int] = None,
        tools_invoked: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log an AI response."""
        event = ChatEvent(
            timestamp=datetime.now(timezone.utc),
            event_type=ChatEventType.AI_RESPONSE,
            level=LogLevel.INFO,
            workflow_id=workflow_id,
            session_id=session_id,
            user_id=user_id,
            response=response,
            duration_ms=duration_ms,
            tokens_used=tokens_used,
            tools_invoked=tools_invoked,
            metadata=metadata
        )
        self.log_chat_event(event)

    def log_workflow_start(
        self,
        workflow_id: str,
        workflow_type: str,
        parameters: Dict[str, Any],
        session_id: Optional[str] = None,
        user_id: Optional[str] = None
    ):
        """Log workflow execution start."""
        event = ChatEvent(
            timestamp=datetime.now(timezone.utc),
            event_type=ChatEventType.WORKFLOW_START,
            level=LogLevel.INFO,
            workflow_id=workflow_id,
            session_id=session_id,
            user_id=user_id,
            metadata={
                "workflow_type": workflow_type,
                "parameters": parameters
            }
        )
        self.log_chat_event(event)

    def log_workflow_complete(
        self,
        workflow_id: str,
        workflow_type: str,
        duration_ms: float,
        tokens_used: int = 0,
        tools_invoked: Optional[List[str]] = None,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log workflow completion."""
        event = ChatEvent(
            timestamp=datetime.now(timezone.utc),
            event_type=ChatEventType.WORKFLOW_COMPLETE,
            level=LogLevel.INFO,
            workflow_id=workflow_id,
            session_id=session_id,
            user_id=user_id,
            duration_ms=duration_ms,
            tokens_used=tokens_used,
            tools_invoked=tools_invoked,
            metadata={
                "workflow_type": workflow_type,
                **(metadata or {})
            }
        )
        self.log_chat_event(event)

    def log_workflow_error(
        self,
        workflow_id: str,
        workflow_type: str,
        error: str,
        duration_ms: Optional[float] = None,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log workflow error."""
        event = ChatEvent(
            timestamp=datetime.now(timezone.utc),
            event_type=ChatEventType.WORKFLOW_ERROR,
            level=LogLevel.ERROR,
            workflow_id=workflow_id,
            session_id=session_id,
            user_id=user_id,
            error=error,
            duration_ms=duration_ms,
            metadata={
                "workflow_type": workflow_type,
                **(metadata or {})
            }
        )
        self.log_chat_event(event)

    def log_tool_execution(
        self,
        workflow_id: str,
        tool_name: str,
        duration_ms: float,
        success: bool,
        result: Optional[Any] = None,
        error: Optional[str] = None,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None
    ):
        """Log tool execution."""
        event = ChatEvent(
            timestamp=datetime.now(timezone.utc),
            event_type=ChatEventType.TOOL_EXECUTION,
            level=LogLevel.ERROR if error else LogLevel.INFO,
            workflow_id=workflow_id,
            session_id=session_id,
            user_id=user_id,
            duration_ms=duration_ms,
            tools_invoked=[tool_name],
            error=error,
            metadata={
                "tool_name": tool_name,
                "success": success,
                "result": str(result) if result else None
            }
        )
        self.log_chat_event(event)

    def _write_to_file(self, event: ChatEvent, log_data: Dict[str, Any]):
        """Write event to appropriate file-based logs."""
        try:
            # Write to conversation log (grouped by date)
            date_str = event.timestamp.strftime("%Y-%m-%d")
            conv_file = self.log_dir / "conversations" / f"conversations_{date_str}.jsonl"
            
            # Write conversation events
            if event.event_type in [ChatEventType.USER_MESSAGE, ChatEventType.AI_RESPONSE]:
                with open(conv_file, "a", encoding="utf-8") as f:
                    f.write(json.dumps(log_data, ensure_ascii=False) + "\n")
            
            # Write error logs
            if event.level == LogLevel.ERROR:
                error_file = self.log_dir / "errors" / f"errors_{date_str}.jsonl"
                with open(error_file, "a", encoding="utf-8") as f:
                    f.write(json.dumps(log_data, ensure_ascii=False) + "\n")
            
            # Write analytics data (workflow metrics)
            if event.event_type in [ChatEventType.WORKFLOW_COMPLETE, ChatEventType.WORKFLOW_ERROR]:
                analytics_file = self.log_dir / "analytics" / f"metrics_{date_str}.jsonl"
                with open(analytics_file, "a", encoding="utf-8") as f:
                    f.write(json.dumps(log_data, ensure_ascii=False) + "\n")
                    
        except Exception as e:
            # Don't fail the main process if logging fails
            self.logger.error("Failed to write chat log to file", error=str(e))

    def get_conversation_history(
        self, 
        session_id: str, 
        limit: int = 50,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve conversation history for a session.
        
        Args:
            session_id: Session ID to filter by
            limit: Maximum number of messages to return
            start_date: Start date filter
            end_date: End date filter
            
        Returns:
            List of conversation events
        """
        conversations = []
        
        try:
            conv_dir = self.log_dir / "conversations"
            if not conv_dir.exists():
                return conversations
            
            # Get log files to search
            log_files = sorted(conv_dir.glob("conversations_*.jsonl"))
            
            for log_file in reversed(log_files):  # Start with most recent
                try:
                    with open(log_file, "r", encoding="utf-8") as f:
                        for line in f:
                            try:
                                event = json.loads(line.strip())
                                
                                # Filter by session_id
                                if event.get("session_id") != session_id:
                                    continue
                                
                                # Filter by date range if provided
                                if start_date or end_date:
                                    event_time = datetime.fromisoformat(event["timestamp"].replace("Z", "+00:00"))
                                    if start_date and event_time < start_date:
                                        continue
                                    if end_date and event_time > end_date:
                                        continue
                                
                                conversations.append(event)
                                
                                # Stop if we've reached the limit
                                if len(conversations) >= limit:
                                    return conversations
                                    
                            except json.JSONDecodeError:
                                continue
                                
                except FileNotFoundError:
                    continue
                    
        except Exception as e:
            self.logger.error("Failed to retrieve conversation history", error=str(e))
        
        return conversations

    def get_analytics_summary(self, days: int = 7) -> Dict[str, Any]:
        """
        Get analytics summary for the specified number of days.
        
        Args:
            days: Number of days to analyze
            
        Returns:
            Analytics summary with metrics
        """
        summary = {
            "total_conversations": 0,
            "total_messages": 0,
            "total_errors": 0,
            "avg_response_time_ms": 0,
            "total_tokens_used": 0,
            "popular_tools": {},
            "error_types": {},
            "daily_stats": []
        }
        
        try:
            # Analyze conversation and analytics files
            end_date = datetime.now(timezone.utc)
            start_date = end_date - timedelta(days=days)
            
            response_times = []
            tokens_used = []
            tools_used = []
            
            for i in range(days):
                date = start_date + timedelta(days=i)
                date_str = date.strftime("%Y-%m-%d")
                
                # Load analytics file for the day
                analytics_file = self.log_dir / "analytics" / f"metrics_{date_str}.jsonl"
                daily_conversations = 0
                daily_errors = 0
                
                if analytics_file.exists():
                    with open(analytics_file, "r", encoding="utf-8") as f:
                        for line in f:
                            try:
                                event = json.loads(line.strip())
                                if event["event_type"] == "workflow_complete":
                                    daily_conversations += 1
                                    if event.get("duration_ms"):
                                        response_times.append(event["duration_ms"])
                                    if event.get("tokens_used"):
                                        tokens_used.append(event["tokens_used"])
                                    if event.get("tools_invoked"):
                                        tools_used.extend(event["tools_invoked"])
                                elif event["event_type"] == "workflow_error":
                                    daily_errors += 1
                            except json.JSONDecodeError:
                                continue
                
                summary["daily_stats"].append({
                    "date": date_str,
                    "conversations": daily_conversations,
                    "errors": daily_errors
                })
                
                summary["total_conversations"] += daily_conversations
                summary["total_errors"] += daily_errors
            
            # Calculate averages and summaries
            if response_times:
                summary["avg_response_time_ms"] = sum(response_times) / len(response_times)
            if tokens_used:
                summary["total_tokens_used"] = sum(tokens_used)
            
            # Count popular tools
            from collections import Counter
            tool_counter = Counter(tools_used)
            summary["popular_tools"] = dict(tool_counter.most_common(10))
            
        except Exception as e:
            self.logger.error("Failed to generate analytics summary", error=str(e))
        
        return summary


# Global chat logger instance
_chat_logger: Optional[ChatLogger] = None


def get_chat_logger() -> ChatLogger:
    """Get the global chat logger instance."""
    global _chat_logger
    if _chat_logger is None:
        _chat_logger = ChatLogger()
    return _chat_logger


def init_chat_logger(log_dir: str = "logs", max_file_size_mb: int = 100) -> ChatLogger:
    """Initialize the global chat logger with custom settings."""
    global _chat_logger
    _chat_logger = ChatLogger(log_dir=log_dir, max_file_size_mb=max_file_size_mb)
    return _chat_logger