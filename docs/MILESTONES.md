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

## Milestone 3P: Local library usability polish

**Status: implemented**

- Add browser-local document search to filter the local library by title or
  source without contacting a provider.
- Add live word and character counts for the active source document.
- Keep the active document unchanged when the filter hides it.
- Show an empty state and clear-filter action when no stored documents match.
- Track post-M4 continuation in the
  [post-M4 roadmap](plans/post-m4-roadmap.md).

## Milestone 4: Authentication and remote storage

**Status: M4A-M4D scaffolding implemented; live OAuth/provider sync deferred**

- Follow the staged
  [auth and remote storage implementation plan](plans/auth-remote-storage-plan.md).
- M4A: route the local MVP document collection through a provider-neutral
  list/get/create/update/delete adapter with content/title revision tokens.
- M4A: persist per-document provider metadata and explicit sync states
  separately from document content.
- M4A: preserve local source when a provider adapter write fails, with contract
  and state-transition coverage for local and in-memory adapters.
- Keep `localStorage` as the default adapter and the editor behavior unchanged.
- M4B: add provider descriptors, connection status, strict GitHub/return-path
  validation, and a collapsed opt-in Remote Storage panel.
- M4B: define inert typed GitHub connect/import/sync/disconnect scaffolds
  without activating the legacy auth or `/api/github/*` routes.
- M4B next substep, deferred: implement live GitHub OAuth/API access with
  server-held credentials only after explicit user consent.
- M4C: persist provider-neutral stale-revision conflict details containing the
  last synced base and immutable local/remote snapshots.
- M4C: produce pure keep-local, accept-remote-with-recovery-copy, and manual
  resolution requests without mutating local storage or calling a provider.
- M4C next substep, deferred: add live conflict UI and apply explicit recovery
  requests after provider sync is implemented.
- M4D: add reusable typed provider errors, safe error normalization, timeout
  wrapping, response-size guards, and rate-limit/retry classification.
- M4D: add sensitive log redaction plus secure random CSRF/OAuth state-token
  creation, comparison, and validation primitives.
- M4D live integration, deferred: apply the scaffold to future API routes,
  security headers, OAuth/session lifecycle, and provider network clients
  before broadening remote availability.

## Milestone 5: Provider activation, collaboration, WYSIWYG, and executable cells

**Status: M5A route contract preflight started; live provider access deferred**

- Follow the [post-M4 roadmap](plans/post-m4-roadmap.md) before activating live
  GitHub OAuth, remote import/link, conflict UI, WYSIWYG, or executable cells.
- M5A: define credential-free typed contracts for explicit GitHub OAuth
  connect, callback, me, and disconnect routes.
- M5A: validate same-origin return paths and short-lived state records through
  M4D safe-error and state-token primitives, with a single-use server-side
  state-store interface.
- M5A next substep, deferred: implement the contracted routes, server-held
  sessions, GitHub requests, and deployment-specific callback configuration.
- Real-time multi-user collaboration and shared sessions.
- WYSIWYG editing and robust source/visual round trips.
- Executable Python/R cells, kernels, and rich output handling.

Existing experimental modules for these later capabilities remain in the
repository where practical, but they are not part of the current MVP contract.

## Strategic track: Quarto 2 rendering foundation (Q2-M0 … Q2-M5)

**Status: source research and plan documented; M0 experiments not yet run.** These Q2-prefixed milestones are a separate engine/research track and do **not** renumber or supersede Quartier app Milestones 1–5. Preserve the existing local-first MVP while engine work proceeds.

Quarto 2 ([quarto-dev/q2](https://github.com/quarto-dev/q2)) already has a Rust core compiled for native and browser WASM, document-profile caching, a project dependency graph, and an interactive browser preview. We will extend these components rather than refactor Quarto 1's TypeScript/Deno core. Quarto 1 remains an external compatibility oracle. The core research objective is **correct dependency invalidation and authoritative incremental rendering with clean-vs-incremental byte parity in a declared deterministic scope**.

- [Q2 architectural decisions and staged roadmap](plans/q2-rendering-foundation.md)
- [Q2-M0 research, implementation and verification protocol](plans/q2-m0-verification.md)
- [Unposted maintainer coordination draft](plans/q2-upstream-question.md)

Prioritize executable Q2-M0 evidence before a renderer refactor, while keeping the current Quartier app functional. Q2's WASM AST→React preview is **not** automatically byte-identical to native HTML serialization; test those paths separately.


**Q2-M0 execution status (2026-10-14):** Native baseline, byte-differential tests, and performance counters executed; upstream WASM/E2E CI verified at the matching nightly source revision. Custom local preview probe and independent full Rust build remain unverified. See the [Q2-M0 execution report](research/q2-m0-execution-2026-10-14.md) and [Q2-M1 first implementation slice](plans/q2-m1-first-slice.md). Preserve this distinction when evaluating readiness.

