# Copilot Instructions for Quartier

## Project Overview
Quartier is a collaborative, web-based editor for Quarto documents with real-time collaboration features, built on the Cloudflare ecosystem.

## Tech Stack
- **Frontend**: Vue 3 + TypeScript + Vite
- **Editor**: Milkdown (WYSIWYG) + CodeMirror (Source mode)
- **Backend**: Cloudflare Pages Functions (serverless)
- **Database**: Cloudflare KV (Key-Value storage)
- **Storage**: Unstorage (abstraction layer supporting multiple backends: GitHub, Google Drive, etc.)
- **Auth**: Cloudflare Access + OAuth (GitHub, Google, etc.)
- **Collaboration**: Yjs for CRDT-based real-time editing
- **UI**: Tailwind CSS + shadcn-vue components
- **Package Manager**: Bun

## Architecture Guidelines

### Dual Authentication System
The application supports two authentication modes:
1. **Host Mode**: Full access to storage backends for document owners
   - Authenticated via OAuth (GitHub, Google, etc.) or Cloudflare Access
   - Can read/write/commit changes to storage backend
   - Can create and manage sessions
   - Storage backend abstracted via unstorage (supports GitHub, Google Drive, etc.)

2. **Guest Mode**: Session-scoped access for collaborators
   - Authenticated via Cloudflare Access (Google, email OTP, etc.)
   - Access scoped to specific sessions and paths
   - Can collaborate in real-time via Yjs
   - Cannot commit directly to storage backend

### Storage Abstraction Pattern
- Frontend uses unstorage abstraction for all storage operations
- Storage backends (GitHub, Google Drive, etc.) are pluggable via unstorage drivers
- Backend API endpoints (e.g., `/api/github/*`) validate authentication before proxying requests
- Never expose storage backend tokens or credentials to the frontend

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
- Never expose storage backend tokens (GitHub, Google Drive, etc.) to the frontend
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
- **Storage operations**: Use unstorage abstraction for all file operations
- **Backend API calls**: Storage backend operations go through backend API (e.g., `/api/github/*`)
- **Session validation**: Check both host authentication and guest session membership
- **File operations**: Use KV for caching, commit to storage backend when ready
- **State management**: Use Vue composables for shared state
- **Routing**: Protected routes require authentication via Cloudflare Access or OAuth

## Best Practices
- Keep changes minimal and focused
- Follow existing code patterns and conventions
- Test authentication flows for both Host and Guest modes
- Use unstorage drivers to support multiple storage backends as first-class citizens
- Consider rate limits when calling storage backend APIs
- Use environment variables (`.dev.vars`) for local development
- Ensure changes work with Cloudflare Pages deployment model
