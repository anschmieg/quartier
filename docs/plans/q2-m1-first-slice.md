# Q2-M1 — First Upstream-Friendly Implementation Slice

**Status: proposed, not implemented.** Derived from [executed M0 evidence](../research/q2-m0-execution-2026-10-14.md). Depends on strict M0 browser-preview probe completion or an explicitly approved scope waiver. This plan does **not** open a PR or fork.

## Core goal

Improve **correct dependency invalidation for project-mode live preview**, reusing Q2's actual staged renderer and include-expansion semantics, while making no changes to the authoritative rendering algorithms. This is about *correctness* before more aggressive differential caching.

### Why this target?

- The Q2 native oracle proves the requested page is byte-correct across six tested updates; targeted rendering intentionally leaves other project artifacts alone.
- `quarto-preview/src/deps.rs` currently advertises only direct, single-hop `include` inputs to the active-page preview.
- Existing [PR #300](https://github.com/quarto-dev/q2/pull/300) already solves full static include/image closure in *single-file presentation* preview. **Reuse this architecture, do not repeat it.**
- [PR #682](https://github.com/quarto-dev/q2/pull/682) already fixes Sass import-closure validation. Do **not** start by rewriting Sass caching.

## Tight patch scope

1. Add a project-mode fixture: `index.qmd` includes `outer.qmd`, which includes `leaf.qmd`; another sibling is unrelated.
2. Pin failing behavior using the real source-pinned `q2 preview` HTTP/WebSocket/browser contract. Editing **leaf** must refresh the derived active-page projection; editing the unrelated sibling must not.
3. Derive transitive dependency closure from the **real** `IncludeExpansionStage`/`DocumentAst::recorded_includes` and resource collection rather than inventing a second Markdown parser or regex.
4. Invalidate correctly on edits, dependency additions, dependency removals, missing files and source renames; ensure watcher filtering never suppresses a necessary render.
5. Handle include cycles, paths outside a project root, symlink aliases, concurrent edits and errors. Prefer over-invalidation with deterministic diagnostics to stale output.
6. Integrate with existing native/WASM project and preview abstractions in Q2. Keep unchanged CLI/full-render bytes unchanged; no new side-effectful caching.
7. Add or extend source-aligned Rust + WASM + Chromium E2E coverage as appropriate; do not claim browser parity from React DOM string comparison.
8. Benchmark invalidation selectivity and CPU wall time. Success requires an actual closed correctness gap, not simply an unconditional full-project rerender.

### Tests

- Nested `A → B → C`: mutate C while previewing A; verify A displays current C.
- Remove `A → B`; later B edits must no longer invalidate A.
- Add `A → D`; subsequent D edit must invalidate A.
- Independent sibling edit leaves A unchanged and does not render unnecessarily.
- Cycle `A → B → A` terminates with appropriate existing diagnostics; does not hang or leak resources.
- Resource edits (SVG/image), bibliography/CSL, and theme changes: record coverage by source category; expand this first PR only where an existing semantics-preserving collector is available.
- A→B→C rapid edits: discard out-of-date async output; newest revision wins.
- Regression: Q2 native full output SHA-256 unchanged before vs after patch on deterministic existing fixtures.
- Release binary/WASM asset provenance: explicitly rebuild the WASM+SPA before claiming browser E2E passes; plain `cargo build --bin q2` can embed stale WASM.

**Acceptance:** End-to-end test fails before the patch, passes after; unrelated-source filtering remains selective; tests on existing preview and renderer pass; no native byte regressions; source pins and environment recorded. Preserve precise diagnostics and stale-cache fallbacks.

## Second, separate slice: Pass-1→Pass-2 resumption

Source: `crates/quarto-core/src/project/orchestrator.rs` explicitly documents rerunning parts of Pass 1 during Pass 2. Investigate the `PipelineData::AtProfile` checkpoint carrying fully validated/parsing results forward. Tests must cover included files, frontmatter edits, different output formats and cache failures; compare *full raw output hashes* against unmodified Q2, with instrumentation proving less work. Do **not** cache arbitrary Lua filters or executable cells.

Keep checkpoint resumption in a separate small upstream PR from preview dependency invalidation. Its intended benefits are performance and avoiding duplicated head work; the first slice's benefit is correctness.

## Upstream contact

Before filing a PR, ask [Q2 maintainers](https://github.com/quarto-dev/q2/issues) whether project-preview dependency tracking is already being unified with the project graph/recorded-includes closure, and whether the AtProfile resumption follow-up already has an assigned implementer. Include the M0 regression evidence and note previously merged PRs.

## Explicit exclusions

No Quarto 1 TypeScript portability rewrite, no new renderer, no wholesale DAG scheduler, no Pyodide/webR yet, no Muya UI work, no Rust-to-Pandoc rewrite, no assumption of Quarto 1 byte parity.
