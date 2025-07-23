# Python LangGraph Microservice

Python-based microservice for molecular analysis and AI orchestration using LangGraph.

## Overview

This service replaces the TypeScript LangGraph implementation with Python-based agents capable of real molecular analysis using scientific computing libraries like BioPython and RDKit.

## Features

- **FastAPI Application**: High-performance async web framework
- **LangGraph Integration**: Python-based workflow orchestration
- **Health Monitoring**: Comprehensive health checks and metrics
- **Docker Support**: Container-ready with multi-stage builds
- **Scientific Computing Ready**: Prepared for BioPython, RDKit integration
- **OpenRouter Compatible**: Works with existing AI provider setup

## Quick Start

### Local Development

1. **Install Dependencies**:
   ```bash
   # Install Poetry (if not already installed)
   curl -sSL https://install.python-poetry.org | python3 -
   
   # Install project dependencies
   poetry install
   ```

2. **Environment Setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your OpenRouter API key
   ```

3. **Run the Service**:
   ```bash
   poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

4. **Access API Documentation**:
   - API Docs: http://localhost:8000/docs
   - Health Check: http://localhost:8000/health
   - Metrics: http://localhost:8000/metrics

### Docker Development

1. **Build and Run**:
   ```bash
   docker-compose up --build
   ```

2. **Run with Monitoring** (optional):
   ```bash
   docker-compose --profile monitoring up --build
   ```

## API Endpoints

### Core Endpoints
- `GET /` - Service information
- `GET /health` - Health check
- `GET /health/ready` - Readiness check
- `GET /health/live` - Liveness check
- `GET /metrics` - Prometheus metrics

### Workflow API (v1)
- `POST /api/v1/workflow/execute` - Execute workflow (compatible with Convex)
- `GET /api/v1/workflow/status/{workflow_id}` - Get workflow status
- `POST /api/v1/workflow/stop/{workflow_id}` - Stop workflow
- `GET /api/v1/workflow/history` - Get workflow history

## Integration with Existing System

This service is designed to be a drop-in replacement for the TypeScript LangGraph implementation:

1. **Convex Integration**: Update `convex/langgraphWorkflow.ts` to call this service
2. **API Compatibility**: Maintains same request/response format
3. **Fallback Support**: Can fallback to TypeScript implementation on failure

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LANGGRAPH_DEBUG` | `false` | Enable debug mode |
| `LANGGRAPH_LOG_LEVEL` | `INFO` | Logging level |
| `LANGGRAPH_OPENAI_API_KEY` | - | OpenRouter/OpenAI API key |
| `LANGGRAPH_OPENAI_BASE_URL` | `https://openrouter.ai/api/v1` | AI API base URL |
| `LANGGRAPH_REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `LANGGRAPH_MAX_CONCURRENT_REQUESTS` | `10` | Max concurrent requests |

## Development

### Project Structure
```
app/
├── main.py              # FastAPI application
├── config.py            # Configuration management
├── agents/              # LangGraph agents
│   └── langgraph_engine.py
├── api/                 # API endpoints
│   └── v1/
│       └── workflow.py
├── core/                # Core utilities
│   ├── health.py        # Health checks
│   └── middleware.py    # Custom middleware
└── tools/               # Scientific tools (future)
```

### Running Tests
```bash
poetry run pytest
```

### Code Quality
```bash
# Format code
poetry run black .
poetry run isort .

# Lint code
poetry run flake8
poetry run mypy .
```

## Deployment

### Production Docker Build
```bash
docker build --target production -t python-langgraph-service:latest .
```

### Kubernetes Deployment
See `k8s/` directory for Kubernetes manifests (to be added).

## Monitoring

- **Health Checks**: Built-in health and readiness endpoints
- **Metrics**: Prometheus metrics at `/metrics`
- **Logging**: Structured JSON logging with correlation IDs
- **Tracing**: Request tracing across service boundaries

## Scientific Computing Integration

This service is prepared for integration with:
- **BioPython**: Protein structure analysis
- **RDKit**: Small molecule analysis  
- **PDB API**: Real-time structure retrieval
- **MDAnalysis**: Molecular dynamics analysis

## Contributing

1. Create feature branch
2. Implement changes with tests
3. Run quality checks
4. Submit pull request

## License

MIT License - see LICENSE file for details.