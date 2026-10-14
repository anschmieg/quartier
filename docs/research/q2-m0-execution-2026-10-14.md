# Q2-M0 Execution Report — 2026-10-14

**Status: baseline research and executable native oracle completed; independent browser-preview scenario and local full-workspace build NOT completed.** Do not misread this as proof of Q1 byte compatibility or universal authoritative incremental rendering. [Research plan](../plans/q2-m0-verification.md) · [Foundation decisions](../plans/q2-rendering-foundation.md).

## Exact reference revisions and provenance

| Runtime | Source revision / release | Actual binary | Verification |
|---|---|---|---|
| Q1 original CLI | [v1.10.19](https://github.com/quarto-dev/quarto-cli/releases/tag/v1.10.19), Pandoc 3.10 | macOS published distribution | SHA-256 of official tarball **c617db5422824e506750573ea94a1e26a475532adfe18c8fea310816ced97f47** matched checksums |
| Q2 stable | [v0.32.0 / 192a231d8da241f60368821b73c56edac5c5f0e7](https://github.com/quarto-dev/q2/commit/192a231d8da241f60368821b73c56edac5c5f0e7) | 0.32.0 macOS arm64 | Official archive SHA-256 **bfbfbd8b3664da541a6f1644e598cf492463db196b2bd1d337c081f29e85427a** |
| Q2 recent | [0.33.0-nightly.20261013 / d110cf7e47d37f9b9771ba5cc7d92a1855934d4a](https://github.com/quarto-dev/q2/commit/d110cf7e47d37f9b9771ba5cc7d92a1855934d4a) | official Oct 13 nightly macOS arm64 | Annotated tag target confirmed; official archive SHA-256 **d4ab115c97ca9e41fbfb895be5872414345df19335019898322a69bd3a771272** |
| Newest inspected source | [a3a928d81d1f3c7846c063c040b6f63168d99b26](https://github.com/quarto-dev/q2/commit/a3a928d81d1f3c7846c063c040b6f63168d99b26) (Oct 14) | **not built or tested** | source-audit snapshot only |

The nightly tag **moves**; reruns should use the pinned source commit and the recorded archive checksum, not assume future `nightly` refers to these bits. No production application code was modified.

## Test execution and artifact-level observations

The reproducible standard-library harness is [research/q2-m0/run_m0.py](../../research/q2-m0/run_m0.py). It runs from an isolated workspace, copies an upstream Q2 five-page website fixture, applies source changes, executes initial full / warm full / subset / independently clean full, records stdout/stderr, and compares output files as *raw* SHA-256 (no semantic normalization or forced byte matches). The code itself was corrected during testing to avoid invalid Q1 YAML.

- [Q2 0.32 stable evidence](../../research/q2-m0/evidence/oracle-run3-summary.json)
- [Q2 Oct 13 nightly evidence](../../research/q2-m0/evidence/oracle-nightly1-summary.json)
- [Additional adversarial evidence](../../research/q2-m0/evidence/adversarial-results.json)

### Native Q2 full versus targeted incremental render

| Mutation | Stable target HTML == clean full | Nightly target HTML == clean full | Nightly all-site HTML differences |
|---|---|---|---|
| Plain paragraph | **PASS** | **PASS** | 0 |
| Insert heading | **PASS** | **PASS** | 0 |
| Modify nested include leaf | **PASS** | **PASS** | 2 snippet pages not targeted |
| Change website title/navigation metadata | **PASS** | **PASS** | 4 untouched sibling pages |
| Change bibliography entry | **PASS** | **PASS** | 0 |
| Modify referenced SVG image | **PASS** | **PASS** | 0 |

Each of 24 Q2 render invocations per version (six cases × initial/warm/subset/clean) returned 0; warm/full comparisons were artifact-identical in the harness. The Sass theme and missing-dependency runs are separate tests described below.

**Correct interpretation:** The selected page is correct, but a subset command is *not* a guarantee that all affected project outputs will be recomputed. The changed nested-include case renders `snippets/*.qmd` as independent project pages in a full build; they are deliberately not selected by the targeted command. Do **not** label that evidence a stale parent render bug. The nav-title case demonstrably leaves stale siblings relative to a clean full build, which is a feature/expectation decision for project preview and automatic invalidation.

### Sass and missing dependencies

An additional valid `[cosmo, custom.scss]` theme case rendered successfully. Changing the SCSS file followed by a single-page render produced matching target HTML but differences in four non-target HTML files and a generated CSS asset relative to clean full output. This is project-subset coverage evidence, *not* proof that Sass imported-partial hashing is broken. [Upstream PR #682](https://github.com/quarto-dev/q2/pull/682) already fixed imported-partial cache validation; do not duplicate it.

A healthy include changed to a missing path in its QMD source caused both targeted and independently full rendering to return nonzero with missing-include diagnostics. There was **no silent stale success**. The clean full render reports additional project-index follow-on diagnostics, which can be investigated separately if relevant.

### Q1 compatibility — explicit separate oracle

Three non-executable standalone fixtures (plain text/list/link; section cross-references; table/math) successfully rendered using both Q1 and Q2. All had the same observed visible text, heading and link/table structure in a simple HTML-parser inspection. **None was byte-identical.** Q1 generated roughly 18–19 KB standalone HTML documents; Q2 nightly generated roughly 1.2–1.7 KB for the equivalent sources. Differences reflect output serialization/template behavior and must remain a separate compatibility workstream. No general semantic-parity claim is made.

## Actual native stage instrumentation (Oct 13 nightly)

This is from `QUARTO_PERF_STATS=1` on a copied five-page fixture, not inferred from total wall-clock time.

| Mode | Pass-1 docs | Pass-1 wall | Pass-2 docs | Pass-2 wall | Sass cache |
|---|---:|---:|---:|---:|---|
| First full/cold | 5 | 25 ms | 5 | 166 ms | 0 hits, 5 compiles |
| Second full/warm | 5 | 2 ms | 5 | 17 ms | 5 hits, 0 compiles |
| Single-page subset | 5 | 0 ms | **1** | 7 ms | 1 hit, 0 compiles |

Engine discovery ran once per process, and engine resolution was lifted from Pass 1 for all five pages. These numbers show **existing** Pass-1 profile reuse and document-level Pass-2 skipping, while Pass 2 still processes all five documents on a warm **full** render. The fixture is tiny; measurements are not representative of large workloads.

## Core and dependency audit

Inspected matching Q2 source, not just roadmap:

- [Two-pass architecture](https://github.com/quarto-dev/q2/blob/main/claude-notes/architecture/01-pipeline.md): shared Rust stages, with native full-HTML and browser AST-projection routes. Pass 2 still repeats parts of the Pass-1 head pipeline.
- [Source/preview WASM layout](https://github.com/quarto-dev/q2/blob/main/claude-notes/architecture/04-q2-preview-wasm.md): same Rust core on native/WASM, but React-rendered preview HTML is *not* byte-identical by construction to the native writer.
- [Profile cache](https://github.com/quarto-dev/q2/blob/main/crates/quarto-core/src/project/profile_cache.rs): Pass-1 reuse and verification of transitive include content hashes.
- [ProjectDependencyGraph](https://github.com/quarto-dev/q2/blob/main/crates/quarto-core/src/project/dependency_graph.rs): project-level forward/reverse dependency edges for navigation, body links, listings and declared dependencies, not a universal per-stage DAG.
- [Preview dependency endpoint](https://github.com/quarto-dev/q2/blob/main/crates/quarto-preview/src/deps.rs): intentionally single-hop direct textual includes in project preview; excludes transitive includes, image, bibliography/CSL and full project dependency graph from this route. Important: [PR #300](https://github.com/quarto-dev/q2/pull/300) **already** implemented full static include/image closure for *single-file presentation* preview; scope differs.
- [Incremental QMD writer](https://github.com/quarto-dev/q2/blob/main/crates/pampa/src/writers/incremental.rs) updates source, **not** HTML fragments. Pass-2 user Lua filters and engines may have side effects, so blindly caching their output would violate correctness.

## Browser and Rust test-suite evidence / limits

The official Q2 Oct 13 commit has successful upstream [WASM Tests and native test suite](https://github.com/quarto-dev/q2/actions/runs/38318853136), successful [TypeScript suites](https://github.com/quarto-dev/q2/actions/runs/38318853064), successful [interactive Chromium/Firefox E2E](https://github.com/quarto-dev/q2/actions/runs/38362971600), and successful [signed nightly build / macOS arm64](https://github.com/quarto-dev/q2/actions/runs/38368968727). This is **upstream CI evidence**, not a claim that we independently ran each suite. An earlier Chromium E2E run failed; the later nightly E2E run succeeded.

The dedicated local nested-include `/api/preview/deps` probe [is preserved as a reproducible script](../../research/q2-m0/preview_probe.py) but **was not executed**: a localhost-server execution request was blocked by the safety environment. This means the exact new reactive-preview case is **not verified experimentally**, even though the direct-only endpoint limitation is explicit in source.

A full local `cargo xtask verify` was **not run**. Q2 pins Rust nightly 2026-04-28 and full WASM/browser build prerequisites; local `rustup` initially tried writing outside the sandbox and the Mac had approximately 11–14 GiB free. Running the full Rust/WASM workspace build could exhaust disk. Upstream CI provides source-aligned regression evidence in the meantime. No independent race/rapid-edit or symlink traversal tests were run; the local server attempt was blocked and other high-risk tests are recorded as follow-up.

## M0 acceptance matrix

| Gate | Status | Evidence / constraint |
|---|---|---|
| Exact versions, binaries, toolchains | **PASS** | Above, hashes and pinned annotated tags |
| Cold/warm/full/subset native runs | **PASS** | Harness, manifests, recorded exit codes |
| Deterministic incremental vs clean byte comparison | **PASS, bounded scope** | Six target-page cases on both Q2 baselines; sibling differences recorded |
| Q1/Q2 comparison matrix | **PASS, bounded scope** | Three successful source-compatible fixtures; no byte matches |
| Browser WASM source alignment and preview semantics | **UPSTREAM CI PASS; local custom probe BLOCKED** | Matching nightly tag + green upstream WASM/E2E; no direct custom nested-include E2E |
| Dependency coverage matrix | **PASS for studied channels; remaining channels unverified** | Text, heading, nav, nested include, citation, image, Sass, missing include |
| Reproducible first M1 target | **PASS** | Preview dependency coverage and Pass-2 resumption seams; see below |
| Performance and cache traces | **PASS** | `QUARTO_PERF_STATS=1` Pass1/Pass2/Sass counters |
| Adversarial/concurrency/security | **PARTIAL; unavailable checks explicitly blocked** | Missing dependency test; direct preview/concurrency/security gaps remain |
| Scoped M1 work / upstream overlap | **PASS** | PR #300 single-file preview and PR #682 Sass import fix already merged |

**Milestone interpretation:** M0 has established its native/rendering research baseline and a first actionable M1 scope, but **strict full acceptance cannot be claimed** until the remaining custom browser and concurrency/security checks are either executed or explicitly waived. Do not turn CI evidence into a false claim of independent byte-parity verification.

## Concrete initial M1 recommendation

Start with **project-preview dependency coverage**: reconcile `quarto-preview/src/deps.rs`'s single-hop textual includes with the real include-expansion/resource-collection semantics, reusing or generalizing existing single-file preview logic from merged PR #300. First create a failing project-mode e2e for `page.qmd → outer.qmd → leaf.qmd` where editing leaf must refresh page; then expand to bibliography/CSL and image resources, ensuring unrelated edits do **not** trigger a rerender. Observe dependency removals and failures; avoid recomputing/rendering entire projects indiscriminately.

Independently investigate Pass-1 `AtProfile` checkpoint resumption to remove duplicated head-work in Pass 2, without caching effectful filters or engine calls. This is an upstream-documented follow-up and should be proposed separately. See [M1 first slice](../plans/q2-m1-first-slice.md).

## Remaining tasks before strict M0 sign-off

1. Execute the source-pinned project-preview nested-include and rapid-edit/browser-revision probes in an authorized test environment.
2. Run or obtain independent evidence for browser AST semantic parity on the chosen fixture (upstream CI covers the general path, not this specific case).
3. Test remaining high-risk cases (e.g. output-format cache partitioning, dynamic dependency removal, symlink/path escapes) or record an explicit scope waiver.
4. Optionally repeat targeted Rust tests using the pinned nightly toolchain in a disk-sufficient environment; existing upstream CI is already green for the tested nightly commit.

No deployment, upstream PR, or renderer refactor was performed in M0.
