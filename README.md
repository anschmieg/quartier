# Quartier

Quartier is a local-first editor for Quarto Markdown documents. The current
Milestone 3 app manages and previews multiple browser-local source documents
without an account or backend. Create, switch, rename, duplicate, delete,
import, edit, preview, and download documents directly in the browser.

The default `/` route is the local editor. Existing experimental modules for
authentication, remote storage, WYSIWYG editing, executable cells, and
collaboration are preserved for later milestones but are not required by the
MVP. See [docs/MILESTONES.md](docs/MILESTONES.md) for the planned sequence and
deferred scope.

## Current Local Editor

- Quarto Markdown source textarea
- Source, split, and preview views for the active document
- Safe local rendering of common Markdown and YAML frontmatter metadata
- Lightweight diagnostics for empty documents and frontmatter fence problems
- Multiple documents persisted automatically in browser `localStorage`
- Create, switch, rename, duplicate, delete, and reset local documents
- Import local `.qmd`, `.md`, `.markdown`, and `.txt` files
- Download the active document as `.qmd` using a sanitized document title
- Automatic migration of the Milestone 1 `quartier.local-document.v1` draft
- No authentication
- No remote storage or server dependency

Imported files are copied into browser storage; Quartier does not modify the
original file. Browser storage is local to the current origin and browser
profile. Download important work as a `.qmd` file before clearing site data.

## Development

Prerequisites:

- Node.js 20 or newer
- npm

Install dependencies and start the frontend:

```bash
npm install
npm run dev:frontend
```

Vite prints the local URL, usually `http://localhost:5173`.

The broader legacy development command also starts Wrangler and PartyKit:

```bash
npm run dev
```

Those backend processes are not needed for the Milestone 3 local editor and
preview.

## Test

Run the complete Vitest suite once:

```bash
npm test -- --run
```

Run Vitest in watch mode:

```bash
npm test
```

End-to-end tests for the broader experimental app remain available separately:

```bash
npm run test:e2e
```

## Build

Type-check and create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Documentation

- [Milestones](docs/MILESTONES.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Contributing](docs/CONTRIBUTING.md)
- [Environment variables](docs/ENVIRONMENT.md)

Documentation outside the milestone plan may describe experimental future
functionality that is not active in the local-first MVP.

## License

MIT
