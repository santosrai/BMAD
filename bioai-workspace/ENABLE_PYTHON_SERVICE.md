# Enable Python LangGraph Service - Complete Setup

## Current Status ✅
- ✅ Python service installed and running on localhost:8000
- ✅ Ngrok installed 
- ✅ Python service re-enabled in Convex
- ⏳ Need to set up tunnel for cloud connectivity

## Quick Setup (5 minutes)

### Step 1: Get ngrok auth token
1. Go to: https://ngrok.com/
2. Sign up for free account (just email + password)
3. Go to: https://dashboard.ngrok.com/get-started/your-authtoken
4. Copy your auth token

### Step 2: Configure ngrok
```bash
ngrok config add-authtoken YOUR_TOKEN_HERE
```

### Step 3: Start the tunnel
```bash
./start-python-tunnel.sh
```

This will:
- Create a public HTTPS URL (like `https://abc123.ngrok-free.app`)
- Show you the exact command to run
- Keep the tunnel active

### Step 4: Configure Convex
Copy the URL from step 3 and run:
```bash
npx convex env set PYTHON_LANGGRAPH_SERVICE_URL https://your-ngrok-url.ngrok-free.app
```

### Step 5: Test
Send a chat message - you should see:
- `🐍 USING PYTHON SERVICE` in browser console
- `🔧 Powered by: 🐍 Python LangGraph Service` in chat response

## What You'll Get

### Python Service Features:
- 🧬 **Real molecular analysis** with BioPython
- 🔍 **Live PDB database** integration
- 📊 **Comprehensive chat logging** and analytics
- 🤖 **Advanced LangGraph agents** with scientific tools
- ⚡ **Tool execution tracking** and performance metrics

### vs TypeScript Engine:
- ❌ Mock molecular analysis only
- ❌ No real scientific computing
- ❌ Basic logging only

## Alternative: Local Development

If you prefer to keep everything local for development:

1. **Run Convex locally:**
   ```bash
   npx convex dev
   ```
   This runs Convex on your machine, so it can reach localhost:8000

2. **Use local URL:**
   ```bash
   # No change needed - already set to http://localhost:8000
   ```

## Troubleshooting

**If chat still shows TypeScript engine:**
1. Check browser console for routing logs
2. Verify Python service is running: `curl http://localhost:8000/health/live`
3. Check Convex environment: `npx convex env list`

**If ngrok tunnel fails:**
1. Make sure auth token is configured
2. Check if Python service is running first
3. Try restarting: `./start-python-tunnel.sh`

## Current Configuration Status

Check your current setup:
```bash
# Python service status
curl -s http://localhost:8000/health/live | python3 -m json.tool

# Convex configuration  
npx convex env list

# Test Python service
curl -X POST "http://localhost:8000/api/v1/workflow/execute" \
  -H "Content-Type: application/json" \
  -d '{"workflowType": "conversation_processing", "parameters": {"message": "test"}}'
```

## Next Steps

1. **Complete ngrok setup** (5 minutes)
2. **Test Python service integration**
3. **Enjoy real AI capabilities** with molecular analysis!

The system is ready - just need the tunnel for cloud connectivity! 🚀