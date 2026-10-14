# Draft: Quarto 2 incremental-rendering coordination

**Status: draft, NOT posted.** The former proposal about separating Quarto 1's TypeScript core from Deno is **superseded** because Q2 already provides a Rust native/WASM core.

**Venue:** [quarto-dev/q2 issues](https://github.com/quarto-dev/q2/issues), after searching for active overlapping issues/PRs.

**Proposed title:** Guidance on extending Q2 dependency invalidation and safe incremental stage reuse

> I'm exploring Quartier, a local-first Quarto editor that aims to reuse Q2's Rust native/WASM rendering core rather than maintaining another renderer.
>
> I noticed the existing two-pass pipeline, document profile cache, ProjectDependencyGraph, and the preview's direct-include dependency endpoint. I'm interested in contributing improvements that also benefit q2 preview and the native CLI.
>
> Is there an existing direction for (1) unifying preview dependency coverage with project/resource dependencies (transitive includes, CSL/bib, themes, navigation), (2) resuming Pass 2 from the cached AtProfile checkpoint rather than repeating the head pipeline, and (3) selectively reusing only proven-pure stage results while preserving full-render equivalence?
>
> We plan to start with a pinned Q2 native/full/subset/WASM audit and byte-level cold-vs-incremental differential tests for deterministic fixtures. Quarto 1 compatibility will be measured separately; there is no assumption that browser React preview markup is identical to native HTML output.
>
> Would one of these make a useful first upstream contribution, or is overlapping work already in progress?

Before posting, check latest code and existing issues (historical docs may describe fixed bugs), present measured evidence, avoid asking maintainers to adopt Quartier, and submit no broad refactor without agreement.
