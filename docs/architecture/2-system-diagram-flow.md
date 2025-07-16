# 2. System Diagram & Flow

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
