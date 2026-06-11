# Quartier Architecture

Quartier is a local-first Quarto authoring application with optional source editing, visual editing, remote storage, and collaboration. The architecture keeps the document model and Quarto intelligence independent from those optional integrations.

## System Overview

```mermaid
flowchart TB
  UI["Vue application shell"]
  Writer["Local-first writer"]
  Workspace["Workspace session + document buffer"]
  Language["Quarto language service"]
  State["Browser state and drafts"]

  Source["CodeMirror source editor"]
  Visual["Milkdown visual editor"]
  Local["Local workspace provider"]
  Remote["GitHub / Google Drive / Nextcloud"]
  Collab["PartyKit + Yjs collaboration"]
  API["Cloudflare Functions API"]

  UI --> Writer
  UI --> Workspace
  Writer --> Language
  Workspace --> State
  Workspace --> Local

  Source -. optional .-> Writer
  Visual -. optional .-> Writer
  Remote -. optional .-> Workspace
  Collab -. optional .-> Visual
  Remote --> API
  Collab --> API
```

The solid path is the baseline application. Dashed modules can be excluded at build time without replacing them with fake implementations.

## Core Data Flow

```mermaid
sequenceDiagram
  participant Editor
  participant Buffer as Document buffer
  participant Language as Quarto language service
  participant Provider as Workspace provider
  participant Drafts as Browser draft storage

  Provider->>Buffer: document snapshot + revision
  Buffer->>Editor: source text
  Editor->>Language: content + cursor context
  Language-->>Editor: completions and diagnostics
  Editor->>Buffer: edited source
  Buffer->>Drafts: autosaved local draft
  Buffer->>Provider: explicit save + base revision
  Provider-->>Buffer: new revision or conflict
```

The `.qmd` source is authoritative. Editors are views over the same source, and storage providers communicate through the `WorkspaceProvider` interface.

## Main Boundaries

| Boundary | Responsibility | Key location |
| --- | --- | --- |
| Application shell | Routes, layout, feature visibility | `src/router`, `src/components/layout` |
| Writer | Offline single-document authoring flow | `src/components/writer` |
| Editors | Source and visual editing surfaces | `src/components/editor` |
| Quarto intelligence | Completions, diagnostics, symbols | `src/core/language` |
| Workspace | Provider-neutral files and sessions | `src/core/workspace` |
| Document state | Drafts, dirty state, revisions | `src/core/state`, `src/composables` |
| Storage | Local and optional remote providers | `src/services/providers` |
| Collaboration | Optional Yjs/PartyKit binding | `src/composables/useCollab.ts` |
| Backend | Authenticated GitHub/session APIs | `functions/api` |

## Build-Time Composition

Quartier uses one small Vite virtual module, `virtual:quartier-features`, as its build boundary.

```mermaid
flowchart LR
  Mode["Vite mode"] --> Profile["Typed build profile"]
  Profile --> Virtual["virtual:quartier-features"]

  Virtual -->|"loader exists"| Source["CodeMirror"]
  Virtual -->|"loader exists"| Visual["Milkdown"]
  Virtual -->|"loader exists"| Remote["Remote providers"]
  Virtual -->|"module exists"| Collab["Collaboration"]

  Virtual -->|"undefined"| Missing["Feature omitted"]
  Missing --> UI["Related controls hidden"]
```

Application code follows a direct optional-capability pattern:

```ts
if (loadRemoteStorage) {
  const remoteStorage = await loadRemoteStorage()
  remoteStorage.registerRemoteStorage()
}
```

There are no disabled adapters, plugin registry, runtime feature toggles, or no-op lifecycle objects. If a loader or module is absent, the feature is unavailable and its implementation is not imported into the bundle.

See [BUILD_PROFILES.md](BUILD_PROFILES.md) for commands and the profile matrix.

## Dependency Direction

```mermaid
flowchart BT
  Integrations["Editors, providers, collaboration"]
  Services["Language, build, document services"]
  Core["Workspace types and state contracts"]

  Integrations --> Services
  Integrations --> Core
  Services --> Core
```

Core types must not import Vue components, editor engines, cloud SDKs, or collaboration transports. Optional integrations may depend on core contracts, never the reverse.

## Adding an Optional Feature

Use the existing pattern only when a dependency should genuinely disappear from diagnostic builds:

1. Keep the feature behind a focused entrypoint.
2. Add its import to `createVirtualFeatureModule`.
3. Export `undefined` when disabled.
4. Check for the optional capability at the nearest composition boundary.
5. Hide related controls and routes.
6. Add a profile test proving the disabled import is absent.

Ordinary Quarto behavior, UI components, and internal helpers should remain normal code rather than becoming configurable modules.
