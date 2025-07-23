# Python LangGraph Service Setup Guide

## Your System Architecture (Correct Expectations!)

✅ **Your understanding is 100% correct:**
- AI capabilities **should** be in the Python microservice
- Using **LangGraph for AI agent system** 
- Python service handles **real molecular analysis** with scientific libraries (BioPython, RDKit)
- Python service provides **comprehensive chat logging** and analytics

## Current Status & Issue

**The Problem:** Convex (cloud) → Python Service (localhost) = Network Failure
- Convex backend runs in the cloud: `https://fearless-goldfish-449.convex.cloud`
- Python service runs locally: `http://localhost:8000`
- Cloud cannot reach localhost → "fetch failed" errors

**The Fix I Just Applied:**
- ✅ Fixed fallback mechanism to properly use TypeScript when Python fails
- ✅ Added clear logging to show which engine is being used
- ✅ System now gracefully degrades instead of showing errors

## Service Routing Status

```bash
# Check current configuration
npx convex env list
```

Current settings:
- `PYTHON_LANGGRAPH_SERVICE_ENABLED=true` (Python service enabled)
- Python service URL: `http://localhost:8000` (localhost - problematic for cloud)

## Solutions (Choose One)

### Option 1: Quick Fix - Enable Fallback (Current State)
**Status:** ✅ ALREADY IMPLEMENTED
- Chat now falls back to TypeScript engine when Python service is unreachable
- You'll see: "🔄 Note: Using TypeScript engine (Python service unavailable)"
- **Pros:** Chat works immediately, no setup required
- **Cons:** Missing real Python AI capabilities

### Option 2: Local Development Setup
**For when developing locally:**

1. **Start Python Service:**
```bash
cd python-langgraph-service/
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

2. **Use Local Convex:**
```bash
npx convex dev
# This runs Convex locally, can reach localhost:8000
```

### Option 3: Public Python Service (Production Ready)

**A. Using ngrok (Quick testing):**
```bash
# Install ngrok: https://ngrok.com/
ngrok http 8000
# Copy the https URL (e.g., https://abc123.ngrok-free.app)
npx convex env set PYTHON_LANGGRAPH_SERVICE_URL https://abc123.ngrok-free.app
```

**B. Deploy to Cloud:**
Deploy Python service to:
- Railway: https://railway.app
- Render: https://render.com  
- AWS/GCP/Azure

Then set the URL:
```bash
npx convex env set PYTHON_LANGGRAPH_SERVICE_URL https://your-deployed-service.com
```

### Option 4: Disable Python Service (Use TypeScript Only)
```bash
npx convex env set PYTHON_LANGGRAPH_SERVICE_ENABLED false
```

## What Each Setup Gives You

### TypeScript Engine (Current Fallback):
- ✅ Basic chat functionality
- ✅ Simple molecular queries  
- ❌ Mock molecular analysis (not real science)
- ❌ No BioPython/RDKit capabilities
- ❌ No comprehensive logging

### Python LangGraph Service (Your Goal):
- ✅ Real molecular analysis with BioPython
- ✅ Live PDB database integration
- ✅ Scientific computing capabilities
- ✅ Comprehensive chat logging & analytics
- ✅ Advanced agent workflows
- ✅ Tool execution tracking

## Test Your Setup

After choosing an option, test by sending a chat message. Check browser console for:

**Python Service Working:**
```
🚀 Hybrid Engine: Workflow Execution Decision: 
decision: '🐍 USING PYTHON SERVICE'
```

**TypeScript Fallback Working:**
```
🔄 Hybrid Engine: Python service failed, falling back to TypeScript engine...
📘✅ Hybrid Engine: Successfully used TypeScript fallback
```

## Recommended Next Steps

1. **Immediate (Current State):** Use the fixed fallback - chat works now
2. **Development:** Set up local Python service for development
3. **Production:** Deploy Python service to cloud for full capabilities

## Architecture Diagram

```
User Chat → Frontend (React) → Convex (Cloud) → Hybrid Engine
                                                      ↓
                                          Python Service (localhost) ❌ fetch failed
                                                      ↓
                                          TypeScript Engine ✅ fallback works
```

**Goal Architecture:**
```
User Chat → Frontend (React) → Convex (Cloud) → Python Service (Cloud) ✅
                                                      ↓
                                          Real AI with BioPython/LangGraph
```

Your expectations are spot-on - the system should use Python for AI capabilities, and with the right setup, it absolutely will!