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

- Detect conflicts when the expected remote revision differs or both local and
  remote content changed since the last synced base.
- Preserve three immutable inputs for resolution: last synced base, current
  local source, and current remote source/revision.
- Provide explicit actions: keep local as a new remote commit, accept remote
  after saving a local recovery copy, or manually resolve from a three-way
  comparison. Never resolve silently.
- Persist pending conflict metadata locally so reload/offline transitions do
  not lose the recovery path.
- Make retries idempotent where possible and show whether a failure occurred
  before or after a remote commit was accepted.
- Add tests for stale revisions, simultaneous edits, interrupted writes,
  reload during conflict, and recovery-copy creation.

**Exit gate:** every conflict path preserves both user versions and returns to
`clean` only after an explicit successful resolution.

## M4D: Provider hardening

- Add API schema validation, response size limits, request timeouts, rate-limit
  handling, retry/backoff rules, and stable user-safe error codes.
- Apply CSRF protection to state-changing API routes and validate repository,
  branch, and path inputs server-side.
- Add security headers, redact sensitive logs, document token revocation, and
  test logout/session expiry behavior.
- Add telemetry limited to operational metadata with no document source or
  credentials; make any analytics separately opt-in.
- Run browser tests against a disposable GitHub repository in a protected CI
  environment. Keep live-provider tests out of pull requests without secrets.
- Review and either adapt or remove legacy GitHub/storage modules once the new
  path reaches parity; do not maintain two active sync implementations.

**Exit gate:** security review items are closed, provider failures are
recoverable, and the opt-in GitHub path has contract, integration, and browser
coverage.

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

During M4A-M4C, also run focused suites as they are added:

```bash
npm test -- --run src/tests/local-mvp.test.ts
npm test -- --run src/tests/storage-adapter.test.ts
npm test -- --run src/tests/sync-state.test.ts
npm test -- --run src/tests/github-remote.test.ts
```

Before completing M4D:

```bash
npm run test:e2e
```

Manual verification must cover: no network/auth prompt for local use, explicit
GitHub consent, offline editing, stale-revision conflict recovery, disconnect
without local data loss, and restoration from a local library backup.
