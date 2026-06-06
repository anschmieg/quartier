# Authentication and Remote Storage Plan

Milestone 4 adds optional remote persistence without weakening the current
local-first editor. Local documents remain usable without an account, and no
network request or login prompt occurs until the user explicitly connects a
provider.

## M4A: Storage adapter boundary and sync state

**Status: implemented**

- Introduce a document storage adapter owned by the local MVP domain, separate
  from the legacy `StorageManager` and file-browser providers.
- Define provider-neutral document operations: list/get/create/update/delete,
  with stable document IDs and a provider revision token on reads and writes.
- Keep `localStorage` as the default adapter and migrate current collections
  without changing their source, title, or timestamps.
- Add per-document remote metadata separately from document content:
  provider ID, remote locator, last synced revision, and last synced source.
- Model visible sync states: `local-only`, `clean`, `local-changes`,
  `syncing`, `conflict`, `offline`, and `error`. Failed sync must never discard
  the local source.
- Add unit/contract tests using local and in-memory adapters. Do not wire OAuth
  or make existing experimental providers active in this stage.

**Exit gate:** the editor behaves exactly as it does today through the local
adapter, and deterministic tests cover state transitions and failed writes.

## M4B: Opt-in GitHub remote boundary

**Status: scaffolding implemented; live OAuth/API integration deferred**

Implemented in the safe scaffolding substep:

- Add a collapsed Remote Storage settings surface with a "Connect GitHub"
  action. Keep it out of the initial editing path, state clearly that local
  editing works without connecting, and never auto-select GitHub.
- Define provider-neutral descriptors, connection status, and typed remote
  client operations for connect/import/sync/disconnect.
- Add a GitHub descriptor and inert client scaffold. No scaffold import,
  component mount, or panel expansion may issue a network request.
- Validate allowlisted same-origin return paths and narrow GitHub owner,
  repository, and relative `.qmd` path inputs before future OAuth/API work.
- Leave existing experimental auth functions and `/api/github/*` routes
  disconnected from the local MVP. M4B is currently a safe UI/API boundary,
  not a claim that those routes are production-ready.

Deferred to the next M4B substep:

- Replace the prototype OAuth flow with a server-generated, short-lived,
  single-use state nonce bound to an allowlisted same-origin return path.
- Keep the access token in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie.
  Expose authenticated user data through `/api/auth/me`, not a readable cookie.
- Request and document the minimum practical GitHub permissions. Show the
  permission and repository impact before redirecting to GitHub.
- Build a narrow typed API client for repository selection and `.qmd` file
  read/write. Normalize server errors and avoid logging tokens or document
  contents.
- On read, retain the Git blob SHA as the remote revision. On write, require the
  expected SHA so stale clients cannot silently overwrite newer content.
- Add disconnect behavior that removes remote credentials and metadata while
  retaining all local documents.

**Scaffolding exit gate:** local editing remains network-free, the remote panel
is collapsed by default, validation and descriptors have deterministic tests,
and every GitHub operation returns a deferred result without contacting the
network.

**Live integration exit gate:** an opted-in user can connect, import/link one
GitHub `.qmd` file, sync an unchanged revision, disconnect, and continue
editing locally.

## M4C: Conflict handling and recovery

**Status: conflict/recovery scaffold implemented; live UI and provider sync deferred**

Implemented in the provider-neutral scaffold:

- Normalize stale expected-revision failures into conflict metadata when the
  last synced base and current remote document are available.
- Preserve three immutable inputs for resolution: last synced base, current
  local source, and current remote source/revision.
- Persist validated pending conflict metadata locally so reloads do not lose
  the recovery path.
- Produce explicit data-only requests to keep local as a new remote commit,
  accept remote after creating a local recovery copy, or begin a manual
  resolution draft. These helpers do not mutate storage or call a network.
- Keep the local source unchanged when adapter writes fail or conflict.
- Cover stale revisions, local preservation, recovery-copy creation, each
  resolution request, and reload-safe conflict persistence with unit tests.

Deferred until live provider synchronization exists:

- Present a three-way conflict UI and apply only the action explicitly selected
  by the user.
- Detect simultaneous edits through live provider reads and sync orchestration.
- Make retries idempotent where possible and show whether a failure occurred
  before or after a remote commit was accepted.
- Add live-provider tests for simultaneous edits, interrupted writes, and
  successful resolution back to `clean`.

**Scaffolding exit gate:** stale conflicts preserve the base, local, and remote
inputs across reloads, and every recovery action is represented as explicit
data without side effects.

**Live integration exit gate:** every conflict path preserves both user
versions and returns to `clean` only after an explicit successful resolution.

## M4D: Provider hardening

**Status: reusable hardening scaffold implemented; live route/provider integration deferred**

Implemented in the provider-neutral scaffold:

- Add typed provider error codes and stable user-safe normalization that does
  not expose upstream messages.
- Add an explicit request-timeout wrapper, incremental/declared response-size
  guards, and HTTP rate-limit/retry classification with `Retry-After` parsing.
- Add recursive sensitive-value redaction for operational logs, including
  authorization, cookies, token-like fields/URLs, and document source/content.
- Add secure random CSRF/OAuth state-token creation, browser/Node-compatible
  comparison, and field-safe validation results for future API routes.
- Cover normalization, timeout/size/rate-limit behavior, redaction boundaries,
  and state-token validation with deterministic unit tests.
- Keep all helpers network-inert. No live OAuth flow, GitHub request, secret,
  or automatic provider call is introduced by this scaffold.

Deferred until live provider integration:

- Apply API schema validation, response limits, request timeouts, rate-limit
  handling, and retry/backoff policy to concrete provider routes and clients.
- Apply CSRF/state protection to state-changing API and OAuth routes and
  validate repository, branch, and path inputs server-side.
- Add security headers, document token revocation, and test logout/session
  expiry behavior.
- Add telemetry limited to operational metadata with no document source or
  credentials; make any analytics separately opt-in.
- Run browser tests against a disposable GitHub repository in a protected CI
  environment. Keep live-provider tests out of pull requests without secrets.
- Review and either adapt or remove legacy GitHub/storage modules once the new
  path reaches parity; do not maintain two active sync implementations.

**Scaffolding exit gate:** hardening and state-token helpers are reusable,
network-inert, deterministic, and covered against sensitive data leakage.

**Live integration exit gate:** security review items are closed, provider
failures are recoverable, and the opt-in GitHub path has contract, integration,
and browser coverage.

## Deferred

- Additional providers such as Google Drive, Nextcloud/WebDAV, and generic Git.
- Repository browsing beyond the narrow `.qmd` workflow.
- Background/automatic sync, multi-device presence, and offline queues.
- Branch creation, pull requests, batch commits, binary assets, and project
  directory synchronization.
- Team accounts, shared ownership, collaboration sessions, WYSIWYG editing,
  and executable cells.

## Verification

Run at each stage:

```bash
npm test -- --run
npm run build
```

During M4A-M4D, also run focused suites as they are added:

```bash
npm test -- --run src/tests/local-mvp.test.ts
npm test -- --run src/tests/storage-adapter.test.ts
npm test -- --run src/tests/sync-state.test.ts
npm test -- --run src/tests/github-remote.test.ts
npm test -- --run src/tests/provider-hardening.test.ts
```

Before completing live M4D integration:

```bash
npm run test:e2e
```

Manual verification must cover: no network/auth prompt for local use, explicit
GitHub consent, offline editing, stale-revision conflict recovery, disconnect
without local data loss, and restoration from a local library backup.
