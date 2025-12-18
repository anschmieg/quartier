# Changelog

All notable changes to Quartier will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.15.0] - 2024-12-16

### Added

- **API Security**: Global CSRF protection using Double Submit Cookie pattern
- **API Security**: Regression test suite for rate limiting and CSRF protection
- **Build**: Added `@cloudflare/workers-types` to project for better API security testing
- **Versioning**: Version bumped to 0.15.0 to reflect major security and dependency updates

### Changed

- **Dependencies**: Migrated to **Tailwind CSS 4.x** (CSS-first configuration)
- **Dependencies**: Updated core packages: `vite`, `vitest`, `lucide-vue-next`, `shadcn-vue`, `yjs`
- **Editor**: Switched to `@milkdown/kit` v7 and removed deprecated `@milkdown/plugin-diagram`
- **Security**: Enhanced middleware to attach `Set-Cookie` headers to error responses (403/429)

### Fixed

- **Types**: Resolved widespread `unknown` type errors in services and components caused by stricter dependency versions
- **Security**: Fixed CSRF token synchronization on rejected requests

## [0.14.2] - 2025-12-16

### Added

- Global API rate limiting middleware (60 req/min)
- Standardized `X-RateLimit-*` headers for all API responses

### Added

- **UI Integration**: `LoadingSpinner`, `EmptyState`, and `ErrorMessage` components integrated into FileBrowser
- **UX**: Auto-save indicators in toolbar (Saving... / Saved)
- **UX**: Unsaved changes warning (browser beforeunload event)
- Comprehensive API documentation with all endpoints and examples
- Environment variables documentation for configuration
- Security best practices guide with incident response procedures
- User guide with tutorials and troubleshooting
- Input validation utilities for API endpoints
- Rate limiting framework for abuse prevention (Global Rate Limiting implemented)
- Connection status tracking for collaboration
- ConnectionStatus UI component for real-time status display
- ESLint configuration for code quality
- Prettier configuration for code formatting
- Dependabot configuration for automated dependency updates
- .dev.vars.example template for local development
- Lint and format npm scripts

### Changed

- Improved collaboration service with automatic reconnection
- Enhanced WebRTC provider with status callbacks
- Better cleanup logic for disconnected collaboration sessions
- Updated README with links to all documentation
- Signaling server configuration now supports multiple servers

### Fixed

- Proper cleanup of awareness state on disconnect
- Memory leaks in collaboration providers

### Security

- Added input sanitization for file paths
- Implemented validation helpers for all data types
- Documented security best practices and procedures
- Added standardized error response format

## [0.9.37] - 2024-12-15

### Added

- Initial public release
- WYSIWYG markdown editor with Milkdown
- Source code editor with CodeMirror
- GitHub OAuth authentication (Host mode)
- Cloudflare Access authentication (Guest mode)
- Real-time collaboration with Yjs
- WebRTC peer-to-peer synchronization
- IndexedDB local persistence
- GitHub repository browsing
- File CRUD operations
- Branch management
- Commit functionality
- Session-based collaboration
- Share link generation
- Command palette (Ctrl/Cmd + K)
- Preview panel
- File browser with tree view
- User authentication flow
- KV-based session storage

### Technical Stack

- Frontend: Vue 3 + TypeScript + Vite
- Editor: Milkdown (WYSIWYG) + CodeMirror (Source)
- Backend: Cloudflare Pages Functions
- Database: Cloudflare KV
- Collaboration: Yjs + y-webrtc + y-indexeddb
- UI Components: shadcn-vue + Radix Vue
- Styling: Tailwind CSS

---

## Release Notes

### Version 0.9.37 (Initial Release)

This is the initial public release of Quartier, a collaborative web-based editor for Quarto documents.

**Key Features**:

- Dual authentication system supporting both repository owners and collaborators
- Real-time collaborative editing with live cursors
- Offline support with local persistence
- Direct GitHub integration for repository management
- Session-based sharing with granular access control

**Known Limitations**:

- No multi-file commits
- No branch creation through UI
- No version history viewer
- No file search functionality
- Uses public WebRTC signaling server
- Deprecated Milkdown plugins (@milkdown/plugin-math, @milkdown/plugin-diagram)

**Coming Soon**:

- Improved mobile responsiveness
- Keyboard shortcuts documentation in-app
- File search and navigation improvements
- Multi-file commit support
- Comments and annotations
- Version history and diff viewer
- Private signaling server deployment
- Performance optimizations

---

## Migration Guide

### From Pre-1.0 to 1.0 (Future)

When version 1.0 is released, the following breaking changes may occur:

**Potential Breaking Changes**:

- API endpoint format changes
- Session storage schema updates
- Authentication flow modifications
- Environment variable renames

**Migration Steps**:
Will be provided when 1.0 is released.

---

## Development Guidelines

### Versioning

Quartier follows Semantic Versioning (SemVer):

- **MAJOR** version: Incompatible API changes
- **MINOR** version: New functionality (backwards-compatible)
- **PATCH** version: Bug fixes (backwards-compatible)

### Changelog Guidelines

When contributing, update this changelog with:

1. **Added**: New features
2. **Changed**: Changes to existing functionality
3. **Deprecated**: Soon-to-be removed features
4. **Removed**: Removed features
5. **Fixed**: Bug fixes
6. **Security**: Security fixes

Place changes under `[Unreleased]` until a version is released.

---

## Links

- [Repository](https://github.com/anschmieg/quartier)
- [Documentation](./docs/)
- [Issues](https://github.com/anschmieg/quartier/issues)
- [Pull Requests](https://github.com/anschmieg/quartier/pulls)

---

## Contributors

Thank you to all contributors who have helped make Quartier better!

- [@anschmieg](https://github.com/anschmieg) - Project creator and maintainer

---

[Unreleased]: https://github.com/anschmieg/quartier/compare/v0.9.37...HEAD
[0.9.37]: https://github.com/anschmieg/quartier/releases/tag/v0.9.37
