# 3. Component Breakdown

## Frontend
- Built with React + Vite + TypeScript
- Chat interface + Molstar embedded
- Session and viewer state via Convex

## Convex Backend
- User authentication
- Page/session models
- File storage (PDB/SDF)
- Real-time viewer triggers

## LangGraph.js
- Multi-step command execution
- Contextual memory (e.g., current protein)
- Tool routing and fallback

## OpenRouter
- Model gateway (GPT, Claude, Mixtral, etc.)
- User key support (BYO key)
- Configurable latency/cost

## Molstar Viewer
- 3D protein/molecule viewer
- Clickable residues
- AI ↔ Viewer interaction enabled

---
