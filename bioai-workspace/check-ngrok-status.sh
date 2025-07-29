#!/bin/bash
# Quick status check for ngrok tunnel and Python service

echo "🔍 Checking Ngrok and Python Service Status"
echo "=========================================="

# Check if ngrok is running
echo "🌐 Checking ngrok status..."
if curl -s http://localhost:4040/api/tunnels >/dev/null 2>&1; then
    echo "✅ Ngrok is running"
    
    # Get tunnel information
    TUNNELS=$(curl -s http://localhost:4040/api/tunnels | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    tunnels = data.get('tunnels', [])
    if tunnels:
        for tunnel in tunnels:
            proto = tunnel.get('proto', 'unknown')
            url = tunnel.get('public_url', 'unknown')
            addr = tunnel.get('config', {}).get('addr', 'unknown')
            print(f'  {proto.upper()}: {url} -> {addr}')
    else:
        print('  No active tunnels found')
except Exception as e:
    print(f'  Error parsing tunnel data: {e}')
")
    echo "$TUNNELS"
else
    echo "❌ Ngrok is not running or not accessible"
    echo "   Start ngrok with: ./start-python-tunnel.sh"
fi

echo ""

# Check if Python service is running
echo "🐍 Checking Python service status..."
if curl -s http://localhost:8000/health/live >/dev/null 2>&1; then
    echo "✅ Python service is running on localhost:8000"
    
    # Try to get ngrok URL from Python service
    echo "🔍 Checking auto-detection capability..."
    NGROK_URL=$(curl -s http://localhost:8000/api/v1/ngrok/url 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('status') == 'success':
        print(f\"✅ Auto-detected URL: {data.get('url')}\")
    else:
        print(f\"⚠️  {data.get('message', 'Auto-detection not available')}\")
except Exception as e:
    print('❌ Error checking auto-detection')
" 2>/dev/null)
    echo "  $NGROK_URL"
else
    echo "❌ Python service is not running"
    echo "   Start it with: cd python-langgraph-service && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
fi

echo ""

# Check Convex environment
echo "⚙️  Checking Convex configuration..."
if command -v npx >/dev/null 2>&1; then
    CONVEX_URL=$(npx convex env list 2>/dev/null | grep PYTHON_LANGGRAPH_SERVICE_URL || echo "Not configured")
    if echo "$CONVEX_URL" | grep -q "Not configured"; then
        echo "⚠️  PYTHON_LANGGRAPH_SERVICE_URL not set in Convex"
    else
        echo "✅ $CONVEX_URL"
    fi
else
    echo "⚠️  npx not found - cannot check Convex configuration"
fi

echo ""
echo "📋 Quick Actions:"
echo "• Start ngrok tunnel: ./start-python-tunnel.sh"
echo "• Start Python service: cd python-langgraph-service && uvicorn app.main:app --reload"
echo "• Check tunnel URLs: curl http://localhost:4040/api/tunnels"
echo "• Auto-detect in frontend: Use the '🔍 Auto-Detect' button in settings"