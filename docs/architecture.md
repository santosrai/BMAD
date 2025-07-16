# Architecture Document: BioAI Workspace

**Version:** 1.0  
**Status:** Draft  
**Date:** July 15, 2025

---

## 1. System Overview

BioAI Workspace is an AI-native, real-time web application that enables natural language interaction with biological data and molecular visualization. It combines client-side workflows, persistent state, and agentic AI reasoning.

**Core Components:**
- React frontend with TypeScript and Vite
- Convex backend (real-time DB, auth, storage)
- LangGraph.js for AI orchestration
- OpenRouter as model gateway
- Molstar for embedded 3D visualization

---

## 2. System Diagram & Flow

**Simplified Architecture Flow:**

```
[User Interface (React/Vite)]
     ⬇️
[LangGraph.js Agent Runtime]
     ⬇️             ↘
[Convex Backend]    [OpenRouter API]
     ⬇️
[Convex Storage: User Data, Files]
     ⬇️
[Molstar Viewer Integration]
```

**Flow Summary:**
1. User enters command in chat.
2. LangGraph processes it and routes to tools or viewer.
3. LLM completions fetched via OpenRouter if needed.
4. Viewer reacts to tool outputs or user interactions.
5. State saved in Convex in real time.

---

## 3. Component Breakdown

### Frontend
- Built with React + Vite + TypeScript
- Chat interface + Molstar embedded
- Session and viewer state via Convex

### Convex Backend
- User authentication
- Page/session models
- File storage (PDB/SDF)
- Real-time viewer triggers

### LangGraph.js
- Multi-step command execution
- Contextual memory (e.g., current protein)
- Tool routing and fallback

### OpenRouter
- Model gateway (GPT, Claude, Mixtral, etc.)
- User key support (BYO key)
- Configurable latency/cost

### Molstar Viewer
- 3D protein/molecule viewer
- Clickable residues
- AI ↔ Viewer interaction enabled

---

## Notes

- All systems integrate seamlessly via event-driven messaging and persistent client state
- Viewer can both listen to and emit events (bi-directional AI <-> 3D link)
- No external backend or server ops needed thanks to Convex
