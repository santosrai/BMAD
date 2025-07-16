# BioAI Workspace

AI-powered platform for bioinformatics research and education. Explore molecular structures and run complex analyses using natural language.

## Project Structure

```
src/
├── components/         # Reusable UI components
├── pages/             # Page components
├── utils/             # Utility functions
├── types/             # TypeScript type definitions
└── assets/            # Static assets
```

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: Convex (real-time database, auth, storage)
- **Routing**: React Router
- **Styling**: CSS with custom design system

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up Convex:
   - Create account at https://convex.dev
   - Run `npx convex dev` to set up your deployment
   - Update `VITE_CONVEX_URL` in `.env.local`

3. Start development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Development

- Development server: `npm run dev`
- Production build: `npm run build`
- Preview build: `npm run preview`

## Path Aliases

The project uses path aliases for clean imports:
- `@/` - src/
- `@/components/` - src/components/
- `@/pages/` - src/pages/
- `@/utils/` - src/utils/
- `@/types/` - src/types/

## Story Implementation

This implements Story 1.1: Set Up Project Infrastructure and Basic App Shell

All acceptance criteria have been met:
- ✅ React + Vite + TypeScript project initialized
- ✅ Convex backend integrated
- ✅ Basic application structure with landing page
- ✅ Navigation framework implemented
- ✅ Development environment runs with hot reload
- ✅ Convex setup ready for connection
- ✅ Basic styling framework configured
- ✅ Build process produces deployable artifacts
- ✅ Scalable folder structure established
