# 5. Technical Assumptions & Constraints

**Tech Stack:**
- Frontend: React + Vite + TypeScript
- Backend: Convex
- AI Framework: LangGraph.js
- AI Gateway: OpenRouter
- 3D Viewer: Molstar

**Constraints:**
- No external backend (Convex handles all logic & state)
- BYO API key model preferred initially
- V1 excludes: real-time collaboration, public sharing, version history
- Frontend must handle AI inference latency with clear loading states
- Must support desktop + tablet (no mobile-first)
