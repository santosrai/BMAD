# Tech Stack & Development

## Core Technologies
- **Frontend**: React 19 + Vite + TypeScript
- **Backend**: Convex (real-time database, auth, storage)
- **AI Framework**: LangGraph.js for multi-step AI execution
- **AI Gateway**: OpenRouter for model access
- **3D Visualization**: Molstar for molecular viewer
- **Routing**: React Router v7
- **Testing**: Vitest + React Testing Library + jsdom

## Build System
- **Bundler**: Vite 7.0+ with React plugin
- **TypeScript**: Strict configuration with composite projects
- **Package Manager**: npm (package-lock.json committed)

## Code Quality Tools
- **Linting**: ESLint with TypeScript, React, and React Hooks rules
- **Formatting**: Prettier with custom configuration
- **Testing**: Vitest with globals enabled and jsdom environment

## Common Commands

### Development
```bash
npm run dev          # Start development server with hot reload
npx convex dev       # Start Convex backend development server
```

### Testing
```bash
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:ui      # Run tests with UI interface
```

### Build & Deploy
```bash
npm run build        # TypeScript compile + Vite build
npm run preview      # Preview production build locally
npm run lint         # Check code quality
```

## Path Aliases
- `@/` → `src/`
- `@/components/` → `src/components/`
- `@/pages/` → `src/pages/`
- `@/utils/` → `src/utils/`
- `@/types/` → `src/types/`

## Key Dependencies
- **UI**: React 19, React Router DOM 7
- **Backend**: Convex, @convex-dev/auth
- **Development**: Vite, TypeScript, ESLint, Prettier
- **Testing**: Vitest, @testing-library suite