"# Epic 1: Project Foundation and User Management - Greenfield Development

## Epic Goal

Establish the core project infrastructure, authentication, and basic user settings (including API key management) to provide a secure, persistent workspace foundation that allows users to sign up, log in, and configure their environment, delivering immediate value through a basic functional app shell.

## Epic Description

**Existing System Context:**

- Current relevant functionality: None (greenfield project starting from scratch).
- Technology stack: React + Vite + TypeScript (Frontend), Convex (Backend), LangGraph.js (AI), OpenRouter (AI Gateway), Molstar (Viewer).
- Integration points: Convex for auth and storage; initial setup with no prior integrations.

**Enhancement Details:**

- What's being added/changed: Set up the base application structure, implement user authentication, and add API key management for OpenRouter.
- How it integrates: Uses Convex for real-time auth and storage; frontend connects via Convex hooks.
- Success criteria: Users can create accounts, log in, save API keys, and see a basic workspace UI; measurable by successful auth flows and session persistence.

## Stories

1. **Story 1: Set Up Project Infrastructure and Basic App Shell** - Implement the initial React/Vite app with Convex integration, including a landing page and basic navigation.
2. **Story 2: Implement User Authentication and Account Management** - Add sign-up, login, and profile management using Convex auth.
3. **Story 3: Add API Key Settings and Validation** - Create settings page for users to input and validate their OpenRouter API keys, stored securely in Convex.

## Compatibility Requirements

- [ ] Existing APIs remain unchanged (N/A for greenfield).
- [ ] Database schema changes are backward compatible (Initial schema setup).
- [ ] UI changes follow existing patterns (Establish initial patterns based on architecture).
- [ ] Performance impact is minimal (Baseline performance established).

## Risk Mitigation

- **Primary Risk:** Integration issues with Convex setup leading to auth failures.
- **Mitigation:** Follow Convex documentation strictly and include unit tests for auth flows.
- **Rollback Plan:** Revert to previous commit; no data loss since greenfield.

## Definition of Done

- [ ] All stories completed with acceptance criteria met.
- [ ] Existing functionality verified through testing (N/A; new baseline).
- [ ] Integration points working correctly.
- [ ] Documentation updated appropriately.
- [ ] No regression in existing features (N/A)." 