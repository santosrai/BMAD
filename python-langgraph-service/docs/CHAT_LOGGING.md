# Chat Logging in Python LangGraph Microservice

## Overview

The Python LangGraph microservice includes comprehensive chat logging capabilities that capture all user interactions, AI responses, tool executions, and system events. This logging system provides:

- **Real-time conversation tracking**
- **Performance metrics and analytics**
- **Error monitoring and debugging**
- **User interaction insights**
- **File-based and API-based log access**

## Features

### 🔍 **What Gets Logged**

1. **User Messages**: All incoming user messages with context
2. **AI Responses**: Generated responses with token usage and timing
3. **Workflow Events**: Start, completion, and error events
4. **Tool Executions**: Individual tool calls with performance metrics
5. **Context Updates**: Session and user state changes

### 📊 **Log Types**

- **Structured Logs**: JSON-formatted logs with consistent schema
- **Conversation Logs**: User/AI message pairs grouped by session
- **Error Logs**: Detailed error information for debugging
- **Analytics Logs**: Aggregated metrics for performance monitoring

### 🎯 **Storage Options**

- **File-based**: Organized by date in `/logs` directory
- **API Access**: RESTful endpoints for programmatic access
- **Structured Format**: JSON Lines (.jsonl) for easy parsing

## API Endpoints

### 1. Get Conversation History

```http
GET /api/v1/workflow/logs/conversation/{session_id}?limit=50
```

**Parameters:**
- `session_id` (required): Session ID to filter by
- `limit` (optional): Maximum number of messages (default: 50)

**Response:**
```json
{
  "session_id": "session_123",
  "conversation_count": 12,
  "conversations": [
    {
      "timestamp": "2025-07-22T21:10:14.739470+00:00",
      "event_type": "user_message",
      "level": "info",
      "workflow_id": "84444ebc-d9dc-4425-9f46-741bf12e9933",
      "session_id": "session_123",
      "user_id": "user_456",
      "message": "Can you analyze protein structure 1ABC?",
      "metadata": {
        "workflow_type": "molecular_analysis_workflow",
        "has_api_key": true
      }
    },
    {
      "timestamp": "2025-07-22T21:10:15.250123+00:00",
      "event_type": "ai_response",
      "level": "info",
      "workflow_id": "84444ebc-d9dc-4425-9f46-741bf12e9933",
      "session_id": "session_123",
      "user_id": "user_456",
      "response": "I've analyzed protein structure 1ABC...",
      "duration_ms": 1250.5,
      "tokens_used": 85,
      "tools_invoked": ["pdb_search", "molecular_analysis"]
    }
  ]
}
```

### 2. Get Analytics Summary

```http
GET /api/v1/workflow/logs/analytics?days=7
```

**Parameters:**
- `days` (optional): Number of days to analyze (default: 7)

**Response:**
```json
{
  "period_days": 7,
  "analytics": {
    "total_conversations": 45,
    "total_messages": 90,
    "total_errors": 3,
    "avg_response_time_ms": 1250.5,
    "total_tokens_used": 3450,
    "popular_tools": {
      "molecular_analysis": 25,
      "pdb_search": 20,
      "structure_comparison": 8
    },
    "error_types": {
      "ModelUnavailableError": 2,
      "ValidationError": 1
    },
    "daily_stats": [
      {
        "date": "2025-07-22",
        "conversations": 12,
        "errors": 1
      }
    ]
  },
  "generated_at": "2025-07-22T21:10:34.039962+00:00"
}
```

### 3. Get Recent Chats

```http
GET /api/v1/workflow/logs/recent?limit=20
```

**Parameters:**
- `limit` (optional): Maximum number of recent chats (default: 20)

## File Structure

```
logs/
├── conversations/           # User/AI conversations
│   ├── conversations_2025-07-22.jsonl
│   └── conversations_2025-07-23.jsonl
├── errors/                  # Error logs
│   ├── errors_2025-07-22.jsonl
│   └── errors_2025-07-23.jsonl
└── analytics/              # Workflow metrics
    ├── metrics_2025-07-22.jsonl
    └── metrics_2025-07-23.jsonl
```

## Log Schema

### User Message Event
```json
{
  "timestamp": "2025-07-22T21:10:14.739470+00:00",
  "event_type": "user_message",
  "level": "info",
  "workflow_id": "uuid-string",
  "session_id": "session_123",
  "user_id": "user_456",
  "message": "User's message content",
  "metadata": {
    "workflow_type": "conversation_processing",
    "has_api_key": true
  }
}
```

### AI Response Event
```json
{
  "timestamp": "2025-07-22T21:10:15.250123+00:00",
  "event_type": "ai_response",
  "level": "info",
  "workflow_id": "uuid-string",
  "session_id": "session_123",
  "user_id": "user_456",
  "response": "AI's response content",
  "duration_ms": 1250.5,
  "tokens_used": 85,
  "tools_invoked": ["tool1", "tool2"],
  "metadata": {
    "confidence": 0.95,
    "model_used": "claude-3-haiku"
  }
}
```

### Tool Execution Event
```json
{
  "timestamp": "2025-07-22T21:10:14.950123+00:00",
  "event_type": "tool_execution",
  "level": "info",
  "workflow_id": "uuid-string",
  "session_id": "session_123",
  "user_id": "user_456",
  "duration_ms": 150.0,
  "tools_invoked": ["molecular_analysis"],
  "metadata": {
    "tool_name": "molecular_analysis",
    "success": true,
    "result": "analysis completed successfully"
  }
}
```

### Workflow Events
```json
{
  "timestamp": "2025-07-22T21:10:14.739470+00:00",
  "event_type": "workflow_start|workflow_complete|workflow_error",
  "level": "info|error",
  "workflow_id": "uuid-string",
  "session_id": "session_123",
  "user_id": "user_456",
  "duration_ms": 1250.5,
  "tokens_used": 85,
  "tools_invoked": ["tool1", "tool2"],
  "metadata": {
    "workflow_type": "molecular_analysis_workflow",
    "result_status": "success"
  }
}
```

## Usage Examples

### 1. Monitor User Conversations

```bash
# Get recent conversations for a session
curl "http://localhost:8000/api/v1/workflow/logs/conversation/session_123?limit=50"

# Get last 7 days of analytics
curl "http://localhost:8000/api/v1/workflow/logs/analytics?days=7"
```

### 2. Debug Workflow Issues

```bash
# Check error logs for today
grep "workflow_error" logs/errors/errors_$(date +%Y-%m-%d).jsonl

# Analyze tool performance
grep "tool_execution" logs/analytics/metrics_$(date +%Y-%m-%d).jsonl | jq '.duration_ms'
```

### 3. User Behavior Analysis

```python
import json
from datetime import datetime

# Load conversation logs
with open('logs/conversations/conversations_2025-07-22.jsonl', 'r') as f:
    conversations = [json.loads(line) for line in f]

# Analyze user patterns
user_messages = [c for c in conversations if c['event_type'] == 'user_message']
popular_topics = {}

for msg in user_messages:
    # Extract topics from user messages
    if 'protein' in msg['message'].lower():
        popular_topics['protein_analysis'] = popular_topics.get('protein_analysis', 0) + 1
    if 'pdb' in msg['message'].lower():
        popular_topics['pdb_queries'] = popular_topics.get('pdb_queries', 0) + 1

print("Popular topics:", popular_topics)
```

## Performance Monitoring

### Key Metrics Tracked

- **Response Time**: Average AI response generation time
- **Token Usage**: Total tokens consumed per conversation
- **Tool Usage**: Most frequently used tools
- **Error Rates**: Success/failure ratios
- **User Activity**: Sessions per day, messages per session

### Alerts and Monitoring

Monitor these metrics for system health:

- Response time > 5000ms (slow responses)
- Error rate > 5% (system issues)
- Token usage spikes (cost monitoring)
- Tool failure rates > 2% (tool issues)

## Configuration

The logging system can be configured in the Python service:

```python
from app.core.chat_logger import init_chat_logger

# Initialize with custom settings
chat_logger = init_chat_logger(
    log_dir="custom_logs",
    max_file_size_mb=50
)
```

## Privacy and Security

- **User Data**: User IDs are logged but can be hashed for privacy
- **Message Content**: Full message content is logged (consider anonymization for production)
- **API Keys**: Only presence (true/false) is logged, not actual keys
- **Retention**: Implement log rotation and retention policies

## Integration with Monitoring Systems

The logs are compatible with:

- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Grafana**: For dashboard creation
- **Prometheus**: For metrics collection
- **Splunk**: For enterprise log analysis

## Troubleshooting

### Common Issues

1. **Logs not appearing**: Check log directory permissions
2. **API endpoints returning empty**: Verify log files exist and are readable
3. **Performance issues**: Implement log rotation and cleanup

### Debug Commands

```bash
# Check log directory
ls -la logs/

# Verify log format
head -1 logs/conversations/conversations_*.jsonl | jq .

# Count log entries
wc -l logs/conversations/conversations_*.jsonl
```

## Future Enhancements

Planned improvements:

- **Real-time streaming**: WebSocket-based live log streaming
- **Advanced analytics**: ML-based conversation insights
- **Export formats**: CSV, Parquet export options
- **Dashboard UI**: Built-in web dashboard for log visualization
- **Alerting**: Automated alerts for anomalies

---

For more information, see the main service documentation or contact the development team.