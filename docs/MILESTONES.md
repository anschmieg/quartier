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

## Milestone 4: Authentication and remote storage

**Status: deferred**

- Add authentication only when remote workflows require it.
- Reintroduce GitHub and other remote storage providers behind explicit user
  choices.
- Define sync, conflict, recovery, and ownership behavior before making remote
  storage a default.

## Milestone 5: Collaboration, WYSIWYG, and executable cells

**Status: deferred**

- Real-time multi-user collaboration and shared sessions.
- WYSIWYG editing and robust source/visual round trips.
- Executable Python/R cells, kernels, and rich output handling.

Existing experimental modules for these later capabilities remain in the
repository where practical, but they are not part of the current MVP contract.
