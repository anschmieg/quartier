# Q2-M0 — Research, Implementation and Verification Specification

**Status:** source-level research and executable test plan only (2026-10-14). **No M0 test run or parity pass has been claimed.** Supersedes the Quarto 1 TypeScript/Deno portability-baseline proposal.

## Baseline pins

- Q2 source-audit snapshot: [a3a928d81d1f3c7846c063c040b6f63168d99b26](https://github.com/quarto-dev/q2/commit/a3a928d81d1f3c7846c063c040b6f63168d99b26) from 2026-10-14. Verify checkout, installed/built binary and WASM bundle hashes before treating as execution baseline.
- Quarto 1 external oracle: [v1.10.19](https://github.com/quarto-dev/quarto-cli/releases/tag/v1.10.19) (2026-10-06). Its configuration specifies Pandoc 3.10. Pin binary hashes and environment.
- Distinguish the **stable Q1 compatibility oracle**, **native Q2 full-render oracle**, and **Q2 browser preview semantic checks**.

## Exact evidence hierarchy

**Oracle 1 (mandatory for incremental work):** For a given deterministic fixture/version and final source state, compare Q2 cold full render against Q2 warm/subset/incremental output using the complete output-artifact path set and raw SHA-256 bytes. A match of rendered appearance or HTML DOM alone is insufficient.

**Oracle 2 (Q1 compatibility):** Compare Q1 clean output against Q2 clean output. Classify exact match / semantic but not byte match / intentional divergence / unsupported feature / nondeterministic / environment failure. Never label Q2 incrementality defective merely because Q1's writer differs.

**Oracle 3 (browser preview):** Compare source attribution, heading/figure numbering, crossrefs, content, figures, images, warnings, and revision freshness between Q2 native AST semantics and WASM+React preview. Q2 preview omits HTML-emitting stages and does NOT guarantee native HTML byte identity. Do not fabricate such a comparison.

## Source inspection map

| Area | Code | Questions |
|---|---|---|
| Core and runtime | quarto-core, pampa, quarto-system-runtime, wasm-quarto-hub-client | Which runtime interfaces and WASM storage/caches are implemented? |
| Two-pass orchestration | quarto-core/src/project/orchestrator.rs | When can Pass 2 resume from an AtProfile checkpoint instead of reparsing? |
| Stage transforms | quarto-core/src/pipeline.rs, src/stage/, src/transforms/ | Which are pure, global, effectful, output-format-sensitive? |
| Graph | quarto-core/src/project/dependency_graph.rs | Which reverse/forward edges are complete for navigation, xrefs, listings and links? |
| Profile cache | quarto-core/src/project/cache_key.rs, profile_cache.rs | What is fingerprinted; are transitive includes/extension metadata/version changes invalidated? |
| Preview | quarto-preview/src/deps.rs, q2-preview-spa, ts-packages/preview-renderer | Which changes are ignored/replayed/handled as binary updates? |
| Native output | quarto-core/src/stage/stages/render_html.rs, pampa/src/writers/html.rs | What is the authoritative output serialization path? |
| Edits to source | pampa/src/writers/incremental.rs, quarto-ast-reconcile | Separate local QMD source editing from HTML differential render |
| Execution | stage/stages/engine_execution.rs, quarto-preview/src/capture_driver.rs | Effects, capture/replay, trust and cache eligibility |

Primary references: [Pipeline](https://github.com/quarto-dev/q2/blob/main/claude-notes/architecture/01-pipeline.md) · [WASM architecture](https://github.com/quarto-dev/q2/blob/main/claude-notes/architecture/04-q2-preview-wasm.md) · [incremental project fixture](https://github.com/quarto-dev/q2/blob/main/examples/websites/07-incremental/README.md).

## Reproduction commands (instructions, **not executed**)

From isolated checkout:

    git clone https://github.com/quarto-dev/q2.git q2-m0
    cd q2-m0
    git checkout --detach a3a928d81d1f3c7846c063c040b6f63168d99b26
    git rev-parse HEAD
    cat rust-toolchain.toml
    npm ci
    cargo xtask verify
    cargo run --bin q2 -- render examples/websites/07-incremental
    cargo run --bin q2 -- render examples/websites/07-incremental/posts/first.qmd

Q2's native preview embeds a prebuilt WASM SPA. Rebuild the complete chain after renderer edits or risk **silently testing stale WASM**:

    cd hub-client && npm run build:wasm
    cd ..
    cargo xtask build-q2-preview-spa
    cargo build --bin q2

For Quarto 1 use a separately installed checksum-verified v1.10.19 CLI, capture quarto/pandoc versions, confirm supported flags with --help, and run isolated copied fixtures. Targeted Rust tests may form a fast lane, but report full cargo verification as unrun if skipped.

## Edit-sequence fixture matrix

| ID | Input change | Risk / expected invalidation |
|---|---|---|
| F01 | Change ordinary paragraph | Avoid unnecessary heading/citation/asset work |
| F02 | Insert heading above numbered sections | Renumber distant headings and section references |
| F03 | Reorder figure/table labels | Recompute target and reference numbering |
| F04 | Edit nested/transitive include without editing parent | Invalidate parent profile and preview |
| F05 | Change _quarto.yml, _metadata.yml, sidebar, format | Invalidate affected sibling pages and output |
| F06 | Edit Sass imported partial/theme | Recompute CSS and linked resources |
| F07 | Edit bib/CSL without touching source QMD | Invalidate citation output and previews |
| F08 | Change listing target, navigation link, body link | Correct reverse dependency closure |
| F09 | Change image bytes with same path | Invalidate resource projection, not merely textual deps |
| F10 | User Lua filter pure vs time/IO/random | Do not cache unproven effectful Pass 2 |
| F11 | Rapid source A→B→C while older render in flight | Newest revision wins; atomic publish |
| F12 | Same project different output format | Isolate cache keys/output artifacts |
| F13 | Rename/delete dependency, add/remove include | Dynamic graph edges, safe fallback |
| F14 | Path traversal/symlink/project escape | Path-boundary safety and deterministic diagnostics |

For **each** deterministic fixture: cold full render state A twice to prove reproducibility; warm render; mutate to B; render incrementally/subset; independently render B cold; compare all output bytes and paths; inspect invalidation/reuse trace; revert B→A and repeat. Identify whether failure is **under-invalidation** (correctness) or **over-invalidation** (performance).

## Required diagnostic artifacts

Per run record: pinned Q1/Q2 commit, package versions, binary and WASM SHA-256, OS/arch/timezone/locale/fonts, fixture/edit source-tree hash, mode, command argv, stdout/stderr/warnings, artifact file list and hashes, stage executions/timing/cache hit reasons, observed dependency additions/removals, output revision, publish decision.

Implement an executable oracle runner under m0/scripts with separate fixtures and reports. Treat nondeterminism as its own category; do not normalize byte differences to force a pass. Never commit secrets or private user document content.

## Adversarial checks

- Changed/deleted transitive include; modified bibliography/CSL/SCSS import; renumbered upstream heading.
- Dependency additions **and removals**; project navigation changes; old notes may describe already-fixed bugs. The current source has a nav-config hash sentinel—verify before claiming it is broken.
- Corrupt cache, stale version, missing resource, symlink, path aliases, OS differences.
- Opaque Lua transformations and stateful execution: no blanket Pass-2 cache.
- Out-of-order render completions and stale browser WASM bundle.
- Measure actual skipped work and timings; fast-but-stale cannot pass.

## M0 acceptance gates

- [ ] Q1 and Q2 exact versions, binaries and toolchains recorded.
- [ ] Native Q2 cold/full/warm/subset baseline artifacts captured and compared.
- [ ] Byte-level Q2 full-vs-incremental results assessed on deterministic fixtures; mismatches triaged.
- [ ] Q1→Q2 feature/byte compatibility matrix produced.
- [ ] Browser WASM/SPA is source-aligned; semantic preview checks completed.
- [ ] Dependency coverage matrix recorded for structural, resource and cross-document cases.
- [ ] At least one concrete, reproducible M1 issue or safe resumption opportunity identified.
- [ ] Performance and cache traces support the proposed optimization.
- [ ] Concurrency/security adversarial checks performed or specifically reported blocked.
- [ ] M1 patch scoped and upstream overlap checked.

**Preferred initial M1 candidates:** (A) comprehensive preview/include/resource invalidation without unnecessary re-renders; (B) safe Pass 1→Pass 2 AtProfile resumption; (C) nav config propagation if still broken; (D) isolated proven-pure stage caching. Select by results, not intuition.

**Explicitly out of scope for M0:** rewriting Quarto 1, replacing pampa, enabling Pyodide/webR, a Muya editor refactor, universal Q1 parity, or PDF byte-parity promises.
