# Quartier

> **A home for your research.**

Quartier is a collaborative, web-based editor for Quarto documents. It combines the power of markdown editing with real-time collaboration, making it easy to work on research papers, reports, and documentation.

## Documentation

- **[Architecture & System Design](docs/ARCHITECTURE.md)**: Detailed overview of Dual Auth modes (Host/Guest), Backend Proxy, and Collaboration logic.
- **[KV Schema](docs/KV_SCHEMA.md)**: Database structure for sessions, tokens, and verification.
- **[Contributing](docs/CONTRIBUTING.md)**: Development setup and deployment guide.

## Features

- **Markdown & Quarto Editor**: WYSIWYG editor with full markdown support.
- **GitHub Integration**:
  - File CRUD and Branch Management
  - Direct Commits from the browser
  - Repository browsing
- **Real-time Collaboration**:
  - **Host Mode**: Full GitHub access for repository owners.
  - **Guest Mode**: Secure, session-based access for collaborators via Cloudflare Access (Google/email compatible).
  - Live cursor and selection tracking.
- **Command Palette**: Quick access to actions with `Ctrl+K` / `Cmd+K`.

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite
- **Editor**: Milkdown (WYSIWYG) + CodeMirror (Source)
- **Backend**: Cloudflare Pages Functions
- **Database**: Cloudflare KV (Sessions/Cache)
- **Auth**: GitHub OAuth + Cloudflare Access

## Getting Started

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed setup instructions.

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build
```

## License

MIT
