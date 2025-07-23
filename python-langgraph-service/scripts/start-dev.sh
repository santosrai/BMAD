#!/bin/bash
# Development startup script for Python LangGraph Service

set -e

echo "🚀 Starting Python LangGraph Service in development mode..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Copying from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env file with your configuration before continuing."
    exit 1
fi

# Check if Poetry is installed
if ! command -v poetry &> /dev/null; then
    echo "❌ Poetry is not installed. Please install Poetry first:"
    echo "   curl -sSL https://install.python-poetry.org | python3 -"
    exit 1
fi

# Install dependencies if needed
if [ ! -d ".venv" ]; then
    echo "📦 Installing dependencies..."
    poetry install
fi

# Start the service with auto-reload
echo "🔄 Starting service with auto-reload..."
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000