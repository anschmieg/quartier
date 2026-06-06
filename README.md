# Quartier

Quartier is a local-first editor for Quarto Markdown documents. The current
Milestone 1 app deliberately starts small: edit one `.qmd` document in source
form, save it automatically in the browser, reset it, and download it without
an account or backend.

The default `/` route is the local editor. Existing experimental modules for
authentication, remote storage, WYSIWYG editing, executable cells, and
collaboration are preserved for later milestones but are not required by the
MVP. See [docs/MILESTONES.md](docs/MILESTONES.md) for the planned sequence and
deferred scope.

## Current MVP

- Quarto Markdown source textarea
- Automatic browser `localStorage` persistence
- Starter-document reset
- `.qmd` download/export
- No authentication
- No remote storage or server dependency

Browser storage is local to the current origin and browser profile. Download
important work as a `.qmd` file before clearing site data.

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

Those backend processes are not needed for the Milestone 1 editor.

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
