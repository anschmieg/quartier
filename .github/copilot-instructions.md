# Copilot Instructions for Quartier

## Project Overview
Quartier is a collaborative, web-based editor for Quarto documents with real-time collaboration features, built on the Cloudflare ecosystem.

## Tech Stack
- **Frontend**: Vue 3 + TypeScript + Vite
- **Editor**: Milkdown (WYSIWYG) + CodeMirror (Source mode)
- **Backend**: Cloudflare Pages Functions (serverless)
- **Database**: Cloudflare KV (Key-Value storage)
- **Auth**: GitHub OAuth + Cloudflare Access
- **Collaboration**: Yjs for CRDT-based real-time editing
- **UI**: Tailwind CSS + shadcn-vue components
- **Package Manager**: Bun

## Architecture Guidelines

### Dual Authentication System
The application supports two authentication modes:
1. **Host Mode**: Full GitHub access via OAuth for repository owners
   - Uses `gh_token` cookie for API requests
   - Can commit/push changes to GitHub
   - Can create and manage sessions

2. **Guest Mode**: Read-only GitHub access via Cloudflare Access
   - Authenticated via Google or email OTP
   - Access scoped to specific sessions and paths
   - Cannot commit directly to GitHub
   - Can collaborate in real-time via Yjs

### Backend Proxy Pattern
- Frontend NEVER calls GitHub API directly
- All GitHub operations go through `/api/github/*` endpoints
- Functions validate authentication and session membership before proxying requests

### KV Database Patterns
Follow these key patterns:
- `session:{sessionId}` - Session metadata
- `share:{token}` - Share token to session mapping
- `member:{email}` - Reverse index for user sessions
- `owner:{email}` - Reverse index for owned sessions
- `sync:{owner}:{repo}:{path}` - File content caching

## Development Commands
```bash
bun install           # Install dependencies
bun run dev           # Start development (frontend + backend)
bun run build         # Build for production
bun run test          # Run tests with vitest
vue-tsc -b            # Type-check TypeScript
```

## Code Organization
- `/src` - Vue 3 frontend application
  - `/components` - Vue components (organized by feature)
  - `/composables` - Vue composition API composables
  - `/services` - API service layers
  - `/router` - Vue Router configuration
  - `/types` - TypeScript type definitions
  - `/utils` - Utility functions
- `/functions` - Cloudflare Pages Functions (serverless backend)
  - `/api` - API endpoints
  - `/share` - Public share endpoints
  - `/types` - Backend type definitions
- `/test` - Test files and setup
- `/docs` - Documentation (ARCHITECTURE.md, CONTRIBUTING.md, KV_SCHEMA.md)

## Coding Conventions

### TypeScript
- Use TypeScript for all new code (strict mode enabled)
- Define types in `/src/types` or `/functions/types` as appropriate
- Use the `@/` alias for imports from `/src`
- Leverage Vue 3 Composition API with `<script setup>` syntax

### Vue Components
- Use `<script setup lang="ts">` for component scripts
- Follow single-file component structure: `<script setup>`, `<template>`, `<style>`
- Use Composition API (`ref`, `computed`, `watch`, etc.)
- Organize components by feature in subdirectories
- Use shadcn-vue and Tailwind CSS for styling

### API Functions
- Place Cloudflare Functions in `/functions/api`
- Export handler as default function
- Use TypeScript for type safety
- Validate authentication before processing requests
- Return consistent JSON responses

### Styling
- Use Tailwind CSS utility classes
- Follow existing component patterns from shadcn-vue
- Keep custom styles minimal
- Use CSS variables for theming

### Error Handling
- Provide user-friendly error messages
- Log errors appropriately for debugging
- Handle authentication failures gracefully
- Validate session membership before granting access

## Testing
- Use Vitest for unit and integration tests
- Test files in `/src/tests` or co-located with components
- Use jsdom for component testing
- Run tests before committing: `bun run test`

## Security Considerations
- Never expose GitHub tokens to the frontend
- Always validate session membership in backend functions
- Use secure, HttpOnly cookies for authentication
- Sanitize user inputs
- Follow principle of least privilege for guest access

## Collaboration Features
- Yjs handles CRDT for conflict-free real-time editing
- Use y-websocket or y-indexeddb for synchronization
- Track cursors and selections using Milkdown's collab plugin
- Session-based access control for multi-user editing

## Documentation
- Update relevant docs when changing architecture
- Keep ARCHITECTURE.md, CONTRIBUTING.md, and KV_SCHEMA.md in sync
- Document new API endpoints and their authentication requirements
- Include JSDoc comments for complex functions

## Common Patterns
- **GitHub API calls**: Always go through backend proxy at `/api/github/*`
- **Session validation**: Check both host tokens and guest session membership
- **File operations**: Use KV for caching, commit to GitHub when ready
- **State management**: Use Vue composables for shared state
- **Routing**: Protected routes require authentication via Cloudflare Access or GitHub OAuth

## Best Practices
- Keep changes minimal and focused
- Follow existing code patterns and conventions
- Test authentication flows for both Host and Guest modes
- Consider rate limits when calling GitHub API
- Use environment variables (`.dev.vars`) for local development
- Ensure changes work with Cloudflare Pages deployment model
