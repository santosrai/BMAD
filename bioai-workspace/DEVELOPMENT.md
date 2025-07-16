# BioAI Workspace - Development Guide

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start Convex development server:
   ```bash
   npx convex dev
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:5173 (or the port shown in terminal)

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:ui` - Run tests with UI
- `npm run lint` - Check code quality with ESLint

## Convex Integration

The project uses Convex for backend functionality:
- Authentication (password-based)
- Real-time database
- User management

Convex deployment is configured automatically. The development deployment URL is stored in `.env.local`.

## Project Structure

```
src/
├── components/         # Reusable React components
│   ├── auth/          # Authentication-related components
│   └── Header.tsx     # Main navigation header
├── pages/             # Route components
│   ├── auth/          # Authentication pages
│   ├── Landing.tsx    # Landing page
│   └── Workspace.tsx  # Main workspace (protected)
├── hooks/             # Custom React hooks
├── utils/             # Utility functions
├── types/             # TypeScript type definitions
└── styles/            # CSS files

convex/
├── auth.ts           # Authentication configuration
├── schema.ts         # Database schema
└── _generated/       # Auto-generated Convex files
```

## Architecture Notes

This project implements the foundation for a BioAI Workspace with:
- React + Vite + TypeScript frontend
- Convex backend for real-time data and auth
- Responsive design (desktop + tablet support)
- Protected routes for authenticated content
- Extensible architecture for future AI and 3D viewer integration

## Authentication Flow

1. Users land on the homepage
2. "Get Started" button takes them to `/auth`
3. After signup/login, they're redirected to `/workspace`
4. Protected routes require authentication
5. User profile management available at `/profile`

## Testing

The project uses Vitest with React Testing Library:
- Component tests in `src/__tests__/`
- Test setup configured in `src/test-setup.ts`
- Global test configuration in `vite.config.ts`

## Code Quality

- ESLint with TypeScript and React rules
- Prettier for code formatting
- Strict TypeScript configuration
- Path aliases configured for clean imports (`@/components`, etc.)