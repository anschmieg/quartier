# Post-M4 Roadmap

Quartier now has a local-first MVP plus inert M4A-M4D foundations for storage,
remote providers, conflict recovery, and provider hardening. The next work should
activate those foundations one narrow, reversible step at a time.

## M5A: Live GitHub OAuth preflight and API route design

**Goal:** prepare the first live provider path without exposing credentials or
turning remote storage on by default.

**Status:** credential-free route contract primitives implemented; route
handlers, sessions, provider requests, and manual OAuth preflight deferred.

- Decide the GitHub OAuth app registration, callback URL, and minimum scopes.
- Add server route contracts for `connect`, `callback`, `me`, and `disconnect`.
  The typed contract uses `POST /api/github/oauth/connect`,
  `GET /api/github/oauth/callback`, `GET /api/github/oauth/me`, and
  `POST /api/github/oauth/disconnect`.
- Bind OAuth state to a same-origin return path with short-lived, single-use
  server-side state storage. The contract creates ten-minute records, caps
  custom lifetimes at fifteen minutes, and requires atomic destructive `take`
  semantics from the future state store.
- Store provider tokens only in server-held session/cookie state; never expose
  tokens to client JavaScript.
- Apply M4D CSRF, safe error, timeout, response-size, retry, and redaction
  primitives to the route boundary.
- Keep the existing Remote Storage panel opt-in and disconnected by default.

**Needs:** GitHub OAuth app client ID/secret and deployment callback URL.

The implemented contract module and unit tests need none of these credentials.
The legacy `/api/oauth/*` handlers remain disconnected from the local MVP and
do not implement this contract.

**Exit gate:** route contract tests pass, local editing still performs zero
provider network calls, and a manual OAuth preflight can complete in a disposable
environment without linking documents.

## M5B: Remote import/link of one `.qmd`

**Goal:** let an explicitly connected user import or link exactly one GitHub
`.qmd` file.

- Add a narrow GitHub contents client for repository/path reads.
- Validate owner, repository, branch/ref, and `.qmd` path server-side.
- Preserve the Git blob SHA as the first remote revision.
- Store remote metadata separately from local document content.
- Keep imported documents editable offline even if future reads fail.

**Needs:** a disposable GitHub repository for integration tests.

**Exit gate:** one opted-in `.qmd` can be imported/linked, local backups include
the local document state, and disconnect retains local documents.

## M5C: Conflict UI and explicit recovery actions

**Goal:** expose M4C recovery data in the editor once remote writes exist.

- Show base/local/remote conflict summaries without auto-resolving.
- Add explicit actions for keep-local, accept-remote-with-recovery-copy, and
  manual resolution draft.
- Persist unresolved conflict state through reloads.
- Verify every resolution path preserves both versions until the user chooses.

**Needs:** M5B remote metadata and a write path that can return stale revisions.

**Exit gate:** browser tests cover stale revision, reload during conflict,
recovery copy creation, and return to clean only after an explicit successful
resolution.

## M6: WYSIWYG spike

**Goal:** test whether visual editing can round-trip Quarto Markdown without
corrupting source.

- Spike one editor library behind a feature flag or isolated route.
- Measure support for frontmatter, headings, code blocks, callouts, tables, and
  math.
- Keep source editor as the authoritative fallback.

**Exit gate:** documented round-trip results and a keep/adapt/remove decision.

## M7: Executable cells spike

**Goal:** evaluate local or sandboxed execution for Quarto-style code cells.

- Compare Pyodide/WebR/local-worker options already present in the repo.
- Define execution trust boundaries, resource limits, cancellation, and output
  persistence.
- Keep execution opt-in and separate from plain document editing.

**Exit gate:** a documented technical decision with security constraints and a
small verified prototype or explicit rejection.

## Continuous verification

Run before every commit:

```bash
npm test -- --run
npm run build
```

Run before live-provider work is considered complete:

```bash
npm run test:e2e
```

Manual checks: local editing without login, no automatic provider network calls,
backup/restore before risky migrations, explicit consent before OAuth, token
redaction in logs, and conflict recovery without data loss.
