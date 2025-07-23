#!/bin/bash
# Start ngrok tunnel for Python service

echo "🚀 Starting Python LangGraph Service Tunnel"
echo "=========================================="

# Check if Python service is running
if ! curl -s http://localhost:8000/health/live > /dev/null; then
    echo "❌ Python service is not running on localhost:8000"
    echo ""
    echo "Start it with:"
    echo "cd python-langgraph-service/"
    echo "uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
    exit 1
fi

echo "✅ Python service is running"

# Check if ngrok is installed
if ! command -v ngrok >/dev/null 2>&1; then
    echo "❌ ngrok not found. Install it first:"
    echo "./install-ngrok.sh"
    exit 1
fi

echo "🔗 Starting ngrok tunnel..."
echo ""
echo "This will:"
echo "1. Create a public HTTPS URL for your Python service"
echo "2. Show you the URL to configure in Convex"
echo "3. Keep the tunnel running until you stop it (Ctrl+C)"
echo ""

# Start ngrok tunnel
ngrok http 8000 --log=stdout | while read line; do
    echo "$line"
    
    # Extract the public URL when ngrok shows it
    if echo "$line" | grep -q "started tunnel.*http"; then
        URL=$(echo "$line" | grep -o 'https://[^[:space:]]*')
        if [ -n "$URL" ]; then
            echo ""
            echo "🎉 TUNNEL READY!"
            echo "Public URL: $URL"
            echo ""
            echo "📋 Next steps:"
            echo "1. Copy this URL: $URL"
            echo "2. Run: npx convex env set PYTHON_LANGGRAPH_SERVICE_URL $URL"
            echo "3. Test your chat - it should now use Python service!"
            echo ""
            echo "⚠️  Keep this terminal open to maintain the tunnel"
            echo ""
        fi
    fi
done