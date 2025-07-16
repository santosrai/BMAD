# Product Requirements Document: BioAI Workspace

**Version:** 1.0  
**Status:** Draft  
**Date:** July 15, 2025

---

## 1. Product Overview & Vision

**Overview:**  
BioAI Workspace is a web-based, AI-powered platform for bioinformatics research and education. It enables scientists and students to explore molecular structures and run complex analyses using natural language. It integrates real-time 3D visualization, conversational AI, and persistent user sessions to simplify and accelerate the bioinformatics workflow.

**Vision:**  
To become the go-to digital co-pilot for molecular biology, democratizing access to advanced tools through intuitive, language-based interfaces.

---

## 2. Goals and Success Metrics

**Goals:**

1. Increase research efficiency by reducing the time from question to insight.
2. Lower technical barriers to entry in bioinformatics.
3. Provide a persistent and user-friendly workspace.
4. Lay the foundation for a sustainable product with future monetization.

**Success Metrics:**

- Time per Task: 30% reduction in time to generate visualization or analysis.
- User Retention: 40% of new users return within 7 days.
- Session Depth: Avg. 8+ interactions per session.
- Cost per User: AI operations kept under $0.10/session via model tuning.
- Conversion Rate (V2): 5% upgrade to Pro tier.

---

## 3. Target Users & Personas

**Dr. Anya Sharma – The Power User**  
A postdoc researcher in structural biology. Needs speed, control, and advanced analysis. Wants BYO API key, export tools, and fine-grained visual control.

**Ben Carter – The Learner**  
An undergrad biology student. New to bioinformatics, wants simple commands, smart suggestions, and a low-friction learning environment.

**Other Potential User Types (V2+):**
- Bio teachers creating visual materials
- Small biotech startups exploring protein structures
- Researchers in adjacent fields (e.g., pharmacology)

---

## 4. Key Features & Capabilities

### Core Features (V1)
- Natural Language Chat (NLP-based command interface)
- Persistent Sessions (auto-save chat + molecule state)
- 3D Molecular Viewer (Molstar-powered)
- PDB Search & Load
- User Account + API Key Settings
- BYO OpenRouter Key support
- Multi-step AI Execution (LangGraph.js)
- Basic AI prompt suggestions

### Power User Capabilities (Dr. Anya)
- Export to PDB/image
- AI model switch (cost vs quality)
- Upload private PDB files

### Learner Capabilities (Ben)
- Smart follow-ups
- Viewer click-to-chat context
- Preloaded demo Pages

---

## 5. Technical Assumptions & Constraints

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
