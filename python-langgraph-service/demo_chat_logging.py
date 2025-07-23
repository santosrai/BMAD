#!/usr/bin/env python3
"""
Demo script to show chat logging functionality in the Python LangGraph microservice.
This script demonstrates how user chats are logged and can be retrieved for analysis.
"""

import asyncio
import json
import time
from datetime import datetime, timezone
from pathlib import Path

# Add app to Python path
import sys
sys.path.append(str(Path(__file__).parent))

from app.core.chat_logger import ChatLogger, ChatEvent, ChatEventType, LogLevel


async def demo_chat_logging():
    """Demonstrate comprehensive chat logging functionality."""
    print("🚀 Chat Logging Demo for Python LangGraph Microservice")
    print("=" * 60)
    
    # Initialize chat logger with demo logs directory
    demo_log_dir = Path(__file__).parent / "demo_logs"
    chat_logger = ChatLogger(log_dir=str(demo_log_dir))
    
    print(f"📁 Log directory: {demo_log_dir}")
    print()
    
    # Simulate a user conversation
    session_id = "session_123"
    user_id = "user_456"
    workflow_id = f"workflow_{int(time.time())}"
    
    print("💬 Simulating User Conversation")
    print("-" * 30)
    
    # 1. Log user message
    user_message = "Can you analyze the protein structure for PDB ID 1ABC?"
    chat_logger.log_user_message(
        workflow_id=workflow_id,
        message=user_message,
        session_id=session_id,
        user_id=user_id,
        metadata={
            "workflow_type": "molecular_analysis_workflow",
            "has_api_key": True
        }
    )
    print(f"👤 User: {user_message}")
    
    # 2. Log workflow start
    chat_logger.log_workflow_start(
        workflow_id=workflow_id,
        workflow_type="molecular_analysis_workflow",
        parameters={
            "message": user_message,
            "structure_id": "1ABC",
            "context": {
                "userId": user_id,
                "sessionId": session_id
            }
        },
        session_id=session_id,
        user_id=user_id
    )
    print("🔄 Workflow started...")
    
    # 3. Simulate some processing time
    await asyncio.sleep(0.5)
    
    # 4. Log tool execution
    chat_logger.log_tool_execution(
        workflow_id=workflow_id,
        tool_name="pdb_search",
        duration_ms=150.0,
        success=True,
        result={"pdb_id": "1ABC", "title": "Example Protein Structure"},
        session_id=session_id,
        user_id=user_id
    )
    print("🔧 Tool executed: pdb_search")
    
    chat_logger.log_tool_execution(
        workflow_id=workflow_id,
        tool_name="molecular_analysis",
        duration_ms=850.0,
        success=True,
        result={"amino_acids": 150, "secondary_structure": "alpha-helix dominant"},
        session_id=session_id,
        user_id=user_id
    )
    print("🔧 Tool executed: molecular_analysis")
    
    # 5. Log AI response
    ai_response = """I've analyzed the protein structure for PDB ID 1ABC. Here are the key findings:

• **Structure Type**: Alpha-helix dominant protein
• **Length**: 150 amino acids
• **Function**: Enzyme with binding domain
• **Notable Features**: Contains active site at residues 45-52

The structure shows high stability and is suitable for further molecular dynamics studies."""
    
    chat_logger.log_ai_response(
        workflow_id=workflow_id,
        response=ai_response,
        session_id=session_id,
        user_id=user_id,
        duration_ms=1200.0,
        tokens_used=85,
        tools_invoked=["pdb_search", "molecular_analysis"],
        metadata={
            "confidence": 0.95,
            "structure_id": "1ABC"
        }
    )
    print(f"🤖 AI: {ai_response[:100]}...")
    
    # 6. Log workflow completion
    chat_logger.log_workflow_complete(
        workflow_id=workflow_id,
        workflow_type="molecular_analysis_workflow",
        duration_ms=1200.0,
        tokens_used=85,
        tools_invoked=["pdb_search", "molecular_analysis"],
        session_id=session_id,
        user_id=user_id,
        metadata={
            "result_status": "success",
            "response_length": len(ai_response)
        }
    )
    print("✅ Workflow completed")
    print()
    
    # Simulate a second conversation turn
    print("💬 Second Conversation Turn")
    print("-" * 30)
    
    workflow_id_2 = f"workflow_{int(time.time())}_2"
    user_message_2 = "What are the binding sites in this protein?"
    
    chat_logger.log_user_message(
        workflow_id=workflow_id_2,
        message=user_message_2,
        session_id=session_id,
        user_id=user_id
    )
    print(f"👤 User: {user_message_2}")
    
    # Simulate an error in processing
    chat_logger.log_workflow_error(
        workflow_id=workflow_id_2,
        workflow_type="binding_site_analysis",
        error="Binding site prediction model temporarily unavailable",
        duration_ms=300.0,
        session_id=session_id,
        user_id=user_id,
        metadata={
            "error_type": "ModelUnavailableError"
        }
    )
    print("❌ Workflow failed with error")
    print()
    
    # 7. Demonstrate log retrieval
    print("📊 Log Analysis")
    print("-" * 30)
    
    # Get conversation history
    conversations = chat_logger.get_conversation_history(session_id, limit=10)
    print(f"📜 Found {len(conversations)} conversation events for session {session_id}")
    
    # Display conversation summary
    user_messages = [c for c in conversations if c.get("event_type") == "user_message"]
    ai_responses = [c for c in conversations if c.get("event_type") == "ai_response"]
    
    print(f"   • User messages: {len(user_messages)}")
    print(f"   • AI responses: {len(ai_responses)}")
    print()
    
    # Get analytics summary
    analytics = chat_logger.get_analytics_summary(days=1)
    print("📈 Analytics Summary:")
    print(f"   • Total conversations: {analytics['total_conversations']}")
    print(f"   • Total errors: {analytics['total_errors']}")
    print(f"   • Average response time: {analytics['avg_response_time_ms']:.1f}ms")
    print(f"   • Popular tools: {list(analytics['popular_tools'].keys())}")
    print()
    
    # 8. Show log files
    print("📁 Generated Log Files")
    print("-" * 30)
    
    log_files = []
    if demo_log_dir.exists():
        for subdir in ["conversations", "errors", "analytics"]:
            subdir_path = demo_log_dir / subdir
            if subdir_path.exists():
                files = list(subdir_path.glob("*.jsonl"))
                log_files.extend(files)
                print(f"   • {subdir}: {len(files)} files")
    
    print(f"\nTotal log files created: {len(log_files)}")
    
    # Show sample log entries
    if log_files:
        print("\n📝 Sample Log Entry:")
        print("-" * 30)
        
        sample_file = log_files[0]
        with open(sample_file, "r") as f:
            lines = f.readlines()
            if lines:
                sample_entry = json.loads(lines[0])
                print(json.dumps(sample_entry, indent=2))
    
    print()
    print("✨ Chat logging demo completed!")
    print(f"📁 Check the '{demo_log_dir}' directory for all generated logs")


async def demo_api_endpoints():
    """Demonstrate API endpoints for accessing chat logs."""
    print("\n🔌 API Endpoints for Chat Logs")
    print("=" * 40)
    
    print("Available endpoints:")
    print("• GET /api/v1/workflow/logs/conversation/{session_id}")
    print("  - Retrieve conversation history for a session")
    print("  - Parameters: session_id, limit (optional)")
    print()
    
    print("• GET /api/v1/workflow/logs/analytics")
    print("  - Get analytics summary")
    print("  - Parameters: days (optional, default: 7)")
    print()
    
    print("• GET /api/v1/workflow/logs/recent")
    print("  - Get recent chat interactions")
    print("  - Parameters: limit (optional, default: 20)")
    print()
    
    print("Example usage:")
    print("curl http://localhost:8000/api/v1/workflow/logs/conversation/session_123?limit=50")
    print("curl http://localhost:8000/api/v1/workflow/logs/analytics?days=30")


if __name__ == "__main__":
    asyncio.run(demo_chat_logging())
    asyncio.run(demo_api_endpoints())