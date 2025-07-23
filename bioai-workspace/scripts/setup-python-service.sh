#!/bin/bash

# Setup script to enable Python LangGraph service for local development

echo "🐍 Python LangGraph Service Setup"
echo "================================="
echo ""

# Check if Python service is running
echo "📡 Checking Python service status..."
if curl -s http://localhost:8000/health/live > /dev/null 2>&1; then
    echo "✅ Python service is running at http://localhost:8000"
    
    # Test the service
    echo ""
    echo "🧪 Testing service endpoints..."
    echo "Health check:"
    curl -s http://localhost:8000/health/live | python3 -m json.tool
    
    echo ""
    echo "Service info:"
    curl -s http://localhost:8000/ | python3 -m json.tool
    
    echo ""
    echo "📋 Available options for enabling Python service:"
    echo ""
    echo "Option 1: Use ngrok (recommended for testing)"
    echo "  1. Install ngrok: https://ngrok.com/download"
    echo "  2. Run: ngrok http 8000"
    echo "  3. Copy the https URL (e.g., https://abc123.ngrok-free.app)"
    echo "  4. Set in Convex: npx convex env set PYTHON_LANGGRAPH_SERVICE_URL <your-ngrok-url>"
    echo ""
    echo "Option 2: Use local development"
    echo "  1. Keep current setup (Python service disabled in cloud)"
    echo "  2. Enable locally: PYTHON_LANGGRAPH_SERVICE_ENABLED=true in .env.local"
    echo "  3. Chat will use TypeScript engine in cloud, Python locally"
    echo ""
    echo "Option 3: Deploy to cloud (production ready)"
    echo "  1. Deploy Python service to Railway, Render, or similar"
    echo "  2. Set the public URL in Convex environment"
    echo ""
    
    # Check current Convex settings
    echo "🔧 Current Convex environment:"
    npx convex env list
    
else
    echo "❌ Python service is not running at http://localhost:8000"
    echo ""
    echo "To start the Python service:"
    echo "1. Navigate to: cd python-langgraph-service/"
    echo "2. Install dependencies: pip install -r requirements.txt"
    echo "3. Start service: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
    echo ""
    echo "Then re-run this script to continue setup."
fi

echo ""
echo "🎯 Quick Actions:"
echo ""
echo "Enable Python service in Convex:"
echo "  npx convex env set PYTHON_LANGGRAPH_SERVICE_ENABLED true"
echo ""
echo "Disable Python service in Convex (use TypeScript fallback):"
echo "  npx convex env set PYTHON_LANGGRAPH_SERVICE_ENABLED false"
echo ""
echo "Set custom Python service URL:"
echo "  npx convex env set PYTHON_LANGGRAPH_SERVICE_URL https://your-service-url.com"
echo ""
echo "Check current configuration:"
echo "  npx convex env list"
echo ""

# Show current service routing status
echo "📊 Current Service Routing Status:"
echo "=================================="

# Get current environment variables
PYTHON_ENABLED=$(npx convex env list 2>/dev/null | grep PYTHON_LANGGRAPH_SERVICE_ENABLED | cut -d'=' -f2 || echo "not set")
PYTHON_URL=$(npx convex env list 2>/dev/null | grep PYTHON_LANGGRAPH_SERVICE_URL | cut -d'=' -f2 || echo "not set")

echo "Python Service Enabled: $PYTHON_ENABLED"
echo "Python Service URL: $PYTHON_URL"

if [ "$PYTHON_ENABLED" = "true" ]; then
    echo "🐍 Chat will attempt to use Python service"
    if [ "$PYTHON_URL" = "not set" ]; then
        echo "⚠️  No custom URL set - using default http://localhost:8000"
        echo "   This will only work for local development"
    else
        echo "🌐 Using custom URL: $PYTHON_URL"
    fi
else
    echo "📘 Chat will use TypeScript engine (fallback mode)"
fi

echo ""
echo "To test the current setup, send a chat message and check the browser console for routing logs."