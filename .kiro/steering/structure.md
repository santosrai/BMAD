# Project Structure & Organization

## Repository Layout
```
bioai-workspace/           # Main application directory
├── src/                   # Frontend source code
├── convex/               # Backend functions and schema
├── public/               # Static assets
├── docs/                 # Project documentation
└── web-bundles/          # Additional bundles/extensions
```

## Frontend Structure (`src/`)
```
src/
├── components/           # Reusable React components
│   ├── auth/            # Authentication-related components
│   └── settings/        # Settings/configuration components
├── pages/               # Route/page components
│   ├── auth/            # Authentication pages
│   └── settings/        # Settings pages
├── hooks/               # Custom React hooks
├── services/            # External API integrations (OpenRouter)
├── utils/               # Utility functions and helpers
├── styles/              # CSS files organized by feature
├── assets/              # Static assets (images, icons)
└── __tests__/           # Test files mirroring src structure
```

## Backend Structure (`convex/`)
```
convex/
├── auth.ts              # Authentication configuration
├── schema.ts            # Database schema definitions
├── users.ts             # User management functions
├── apiKeys.ts           # API key management
└── _generated/          # Auto-generated Convex files (do not edit)
```

## Documentation Structure (`docs/`)
```
docs/
├── prd.md               # Product Requirements Document
├── architecture.md      # Technical architecture overview
├── epics/               # Epic-level feature documentation
├── stories/             # User story specifications
└── architecture/        # Detailed architecture docs
```

## Naming Conventions
- **Components**: PascalCase (e.g., `Header.tsx`, `AuthForm.tsx`)
- **Files**: camelCase for utilities, PascalCase for components
- **Directories**: lowercase with hyphens for multi-word (e.g., `auth/`, `settings/`)
- **Hooks**: Prefix with `use` (e.g., `useAuth.ts`, `useApiKey.ts`)
- **Services**: Descriptive names (e.g., `openrouter.ts`)

## Import Organization
1. External libraries (React, etc.)
2. Internal components/hooks (using path aliases)
3. Utilities and services
4. Types and interfaces
5. Styles (CSS imports last)

## File Organization Principles
- Group by feature/domain rather than file type
- Keep related components, styles, and tests together
- Use path aliases to avoid deep relative imports
- Separate concerns: components, business logic, and data access