# Quartier × Quarto 2 — Rendering Foundation (2026-10-14)

**Status:** architectural decision and implementation roadmap. Research only; no M0 experiments or renderer changes claimed.

## Decision

Use [quarto-dev/q2](https://github.com/quarto-dev/q2) as the **primary engine and upstream contribution target**, rather than extracting and porting Quarto 1's TypeScript/Deno rendering pipeline. Q2 already has a native+WASM Rust rendering core, staged AST transforms, document-profile caching, project dependency graph, and browser preview. The Quarto 1 CLI is retained as an **external compatibility oracle**, not our future implementation platform.

**North star:** An incremental Q2 rendering session should produce identical **artifact bytes** to a clean full render with the same pinned Q2 version, source, resources, configuration, output format, and deterministic environment. The Quarto 1→Q2 comparison is **separate** and tracks missing features, semantic differences, and byte-only differences rather than assuming Quarto 2 is already fully compatible.

## Nonnegotiable principles

1. Correctness beats cache hits: unknown/dynamic/side-effectful dependencies cause conservative recomputation. Never reuse effectful Lua/filter/execution results merely because a document source file is unchanged.
2. Authoritative incremental rendering is the **research target**; it is not presumed impossible. Full-stage, full-document, or full-project fallback remains valid when locality/purity cannot be proven.
3. Use one coherent dependency-invalidation and revision model for structural, document, asset, stage, computation and output dependencies. Different observation strategies are allowed; no compulsory separate schedulers for text and code.
4. Canonical QMD source is preserved; inline visual decorations (numbers, figures, references, charts) are derived projections. Preview does not silently modify source.
5. Do not conflate Q2's **incremental QMD writer** (localized AST→source edits) with differential HTML rendering.
6. Do not conflate Q2's browser **WASM AST→React preview** with its native authoritative HTML writer: similar structure does not guarantee identical serialized bytes.
7. Existing Quartier MVP stays working. Foundation milestones are prefixed **Q2-** to avoid collision with existing app Milestones 1–5.
8. Scope initial tests to deterministic non-executable HTML. Later Pyodide Python and webR R subsets; no Julia or universal Jupyter/Knitr promise.
9. Ask Q2 maintainers about specific incremental improvements before proposing a broad PR, and keep patch series upstream-compatible.

## Existing upstream foundations (inspected 2026-10-14)

| Capability | Source | Finding / limit |
|---|---|---|
| Native and browser core | [Q2 architecture](https://github.com/quarto-dev/q2/blob/main/claude-notes/architecture/04-q2-preview-wasm.md) | Same Rust core compiled native+WASM; the browser uses an AST projection, not native HTML serialization |
| Stage pipeline | [Pipeline architecture](https://github.com/quarto-dev/q2/blob/main/claude-notes/architecture/01-pipeline.md) | Pass 1 profiles + Pass 2 rendering; Pass 2 still repeats some Pass-1 work |
| Cross-document dependency graph | [dependency_graph.rs](https://github.com/quarto-dev/q2/blob/main/crates/quarto-core/src/project/dependency_graph.rs) | Forward/reverse edges for navigation, body links, listings, declared dependencies; not a per-cell/per-stage DAG |
| Profile cache | [profile_cache.rs](https://github.com/quarto-dev/q2/blob/main/crates/quarto-core/src/project/profile_cache.rs) | Content/version keyed Pass-1 profiles and transitive include verification; not generic Pass-2 output cache |
| Incremental websites | [example](https://github.com/quarto-dev/q2/blob/main/examples/websites/07-incremental/README.md) | Full/subset project modes; unaffected page outputs skipped; Pass 2 still runs for rendered pages |
| Preview dependency filtering | [deps.rs](https://github.com/quarto-dev/q2/blob/main/crates/quarto-preview/src/deps.rs) | Direct single-hop includes; not full transitive asset, bibliography and CSL graph |
| Incremental source writer | [pampa incremental.rs](https://github.com/quarto-dev/q2/blob/main/crates/pampa/src/writers/incremental.rs) | Local AST→QMD edits; not incremental HTML emission |

Quarto 2 is explicitly **experimental and API-unstable**. Pin exact source revisions and distinguish historic architecture notes from current verified behavior.

## Architecture

Canonical QMD + files + configuration → persistent RenderSession (revision, provenance, trust) → shared dependency graph and optional execution provider → existing staged Q2 Rust core → (a) authoritative native/WASM HTML artifacts or (b) editor-oriented WASM AST projection. Only the newest revision can publish results. Edges observed during execution replace previous edges atomically. Each cache entry must carry its full semantic input/version fingerprint. When uncertain, recompute.

Distinguish and measure **four levels of incrementality**:
1. Skip unaffected documents in projects (partly implemented).
2. Reuse Pass-1 profile/AST checkpoints in Pass 2 (not complete).
3. Reuse proven-pure transformations and stage results (research).
4. Incrementally produce changed HTML/artifact fragments (research).

## Revised milestones

**Q2-M0 — Audit and executable oracles.** Pin Q2 and Q1, establish native full/warm/subset and browser preview baselines, map runtime/stages/dependencies/side effects, run cold-vs-incremental artifact checks, build a coverage matrix for include/nav/assets/bib/theme/crossrefs/rapid edits, instrument cache/stage timings. **Exit:** reproducible evidence and a scoped first Q2-M1 change. See [M0 verification](q2-m0-verification.md).

**Q2-M1 — Correctness-preserving incremental core improvements.** Candidate patches: unifying project/preview dependency observation; missing transitive resource invalidation; navigation cross-document refresh; resuming Pass 2 from Pass-1 checkpoint; proven-pure stage result reuse. Start with a failing test on current pinned code; maintain full-render byte parity and conservative fallbacks. **Exit:** measurable avoided work or a corrected stale-output case, full regression suite, independently verified clean-vs-incremental results.

**Q2-M2 — Authoritative subdocument rendering research.** Prototype locality/source-map-aware transform and HTML fragment reuse. Any global crossref, Lua, navigation or unknown effect falls back to enclosing stage/document/full writer.

**Q2-M3 — Quartier editing integration.** Consume Q2 WASM and source maps in the existing local-first Quartier app. Inline numbers, references, figures and charts. Evaluate Q2's React preview/editing infrastructure versus reusing its engine beneath Quartier's current UI. Final HTML comes from the authoritative writer rather than React DOM serialization.

**Q2-M4 — Computational reactivity.** Add optional Pyodide and webR subsets with conservative replay, stateful session invalidation, external inputs and side-effect policy; do not assume variable-level static analysis is sufficient.

**Q2-M5 — Output expansion.** Typst/PDF and further formats after HTML parity; preserve output-engine-specific determinism conditions.

## Repository and upstream strategy

- Existing app: [anschmieg/quartier](https://github.com/anschmieg/quartier). Preserve current MVP milestones and runtime.
- Engine upstream: [quarto-dev/q2](https://github.com/quarto-dev/q2). Pin an unmodified M0 checkout; create a fork only when an upstream-facing patch requires it.
- Legacy compatibility reference: [quarto-dev/quarto-cli](https://github.com/quarto-dev/quarto-cli), pinned CLI. Do not start Quarto 1 portability refactor.
- Ask Q2 maintainers about existing/planned dependency invalidation and Pass-2 resumption, not about separating a Quarto 1 Deno core. [Draft](q2-upstream-question.md).

## Research blockers / risks

Missing invalidation edges, stale output under overlapping edits, incomplete AST source attribution, cross-document renumbering, cache version drift, non-pure Lua/engines, browser-vs-native serializer differences, and Q1↔Q2 feature gaps. A successful cache hit is not sufficient evidence. No claim of total parity or completed M0 is made here.

**Immediate action:** Execute [Q2-M0](q2-m0-verification.md) before committing to the first implementation slice.
