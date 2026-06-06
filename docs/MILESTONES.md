# Quartier Milestones

Quartier is being narrowed to a local-first MVP before expanding into hosted and
collaborative workflows. Each milestone should remain usable on its own and
avoid making later storage or editor choices irreversible.

## Milestone 1: Local-first source editor MVP

**Status: implemented**

- Make a Quarto Markdown source editor the default app experience.
- Persist one working document in browser `localStorage`.
- Allow the document to be reset to a starter template.
- Allow the current source to be downloaded as a `.qmd` file.
- Require no account, backend, or remote storage.
- Cover persistence, reset, and export preparation with Vitest.

## Milestone 2: Document management and import/export

**Status: implemented**

- Create, rename, duplicate, and delete multiple local documents.
- Switch between documents stored in the current browser profile.
- Import `.qmd`, `.md`, `.markdown`, and `.txt` files from the user's device.
- Export the active document as `.qmd` with a sanitized title-based filename.
- Migrate the Milestone 1 `quartier.local-document.v1` draft into the versioned
  multi-document collection on first load.
- Keep all document management, import, and export behavior local-only.

## Milestone 3: Preview and rendering improvements

**Status: implemented**

- Add a deterministic local Markdown/Quarto-style preview alongside source
  editing, with source, split, and preview views.
- Render common Markdown and YAML frontmatter metadata without executing raw
  HTML or unsafe link protocols.
- Report empty documents and obvious unbalanced frontmatter fences.
- Keep preview generation entirely in the browser without a hosted rendering
  service.

## Milestone 3H: Local library backup and restore

**Status: implemented**

- Export every local document, the active document selection, and timestamps in
  a versioned Quartier JSON backup.
- Validate the complete backup before replacing the browser-local library.
- Reject malformed or unsupported backups with safe messages while preserving
  the current library.
- Keep backup and restore independent of authentication and remote providers.

## Milestone 4: Authentication and remote storage

**Status: next, planned**

- Follow the staged
  [auth and remote storage implementation plan](plans/auth-remote-storage-plan.md).
- Establish the storage adapter and sync-state boundary before enabling auth.
- Add GitHub OAuth/API access only through an explicit user opt-in.
- Implement conflict recovery and provider hardening before broadening remote
  availability.

## Milestone 5: Collaboration, WYSIWYG, and executable cells

**Status: deferred**

- Real-time multi-user collaboration and shared sessions.
- WYSIWYG editing and robust source/visual round trips.
- Executable Python/R cells, kernels, and rich output handling.

Existing experimental modules for these later capabilities remain in the
repository where practical, but they are not part of the current MVP contract.
