# Quarto Block Roadmap

This document defines how Quartier classifies Quarto/Pandoc authoring blocks for the hybrid editor MVP. A “block” is any visible document construct that benefits from semantic editing beyond plain text: code cells, callouts, figures, tables, citations, diagrams, theorem environments, and related cross-reference targets.

## Sources

- Official Quarto Markdown basics: <https://quarto.org/docs/authoring/markdown-basics.html>
- Official Quarto cross references: <https://quarto.org/docs/authoring/cross-references>
- Official Quarto tables: <https://quarto.org/docs/authoring/tables>
- Official Quarto reference index: <https://quarto.org/docs/reference/>
- Local schema asset: `src/assets/quarto-intelligence.json`

## Phase Map

| Phase | Block Families | Goal |
| --- | --- | --- |
| Always | Headings, paragraphs, emphasis, links, blockquotes, lists, horizontal rules, plain code fences, raw spans/blocks | Preserve standard Pandoc Markdown editing and source fidelity. |
| Phase 1 | Executable code cells and cell options | Validate the hybrid block model: semantic rest state, focused source/options reveal, command-assisted edits. |
| Phase 2 | Callouts, generic fenced divs, tabsets/panels, columns/layout divs | Make prose-native Quarto containers pleasant and semantic. |
| Phase 3 | Citations, inline references, cross-reference targets, bibliography-backed citation chips | Make scholarly navigation and reference insertion feel native. |
| Phase 4 | Images, figure divs, subfigures, captions, lightbox/media options | Make visual/media blocks semantic without losing Markdown portability. |
| Phase 5 | Pipe tables, table captions, computed table captions, code listings | Improve structured data and listing authoring. |
| Phase 6 | Display equations, equation references, theorem/proof/definition/example blocks | Support formal scholarly writing patterns. |
| Phase 7 | Mermaid, Graphviz/DOT, Observable/OJS, computational visual blocks | Support diagram and reactive-computation authoring. |
| Phase 8 | Includes, shortcodes, comments, raw blocks, dashboards/cards, reveal/slide blocks | Cover project/document structure and format-specific blocks. |

## Exhaustive Inventory

| Family | Example Syntax | Source Area | Current Support | Planned Phase | Notes |
| --- | --- | --- | --- | --- | --- |
| Headings | `## Methods` | Markdown basics / Pandoc | Baseline Markdown | Always | Also cross-referenceable as sections via `#sec-` IDs. |
| Paragraphs | `Plain prose.` | Markdown basics / Pandoc | Baseline Markdown | Always | Core writing surface. |
| Emphasis and inline formatting | `*em*`, `**strong**`, `` `code` `` | Markdown basics / Pandoc | Baseline Markdown | Always | Inline, not block UI. |
| Links | `[text](url)` | Markdown basics / Pandoc | Baseline Markdown | Always | Future autocomplete can help paths/anchors. |
| Blockquotes | `> quote` | Markdown basics / Pandoc | Baseline Markdown | Always | Not planned as custom semantic block. |
| Lists | `- item`, `1. item` | Markdown basics / Pandoc | Baseline Markdown | Always | Includes nested lists and task-list-like GFM behavior where supported. |
| Horizontal rules | `---` | Markdown basics / Pandoc | Baseline Markdown | Always | Must not conflict with YAML frontmatter parsing. |
| Plain code fences | ```` ```python ```` | Markdown basics / Pandoc | Baseline Markdown | Always | Non-executable display code remains simple. |
| Raw HTML/LaTeX blocks | `<div>`, raw TeX | Pandoc Markdown | Source fidelity only | Always | Preserve text; semantic UI later only if concrete UX emerges. |
| YAML frontmatter | `---\ntitle: ...\n---` | Quarto reference metadata | Frontmatter node + completion | Always / schema autocomplete | Document-level metadata, not a content block phase. |
| Executable code cells | ```` ```{python}\n#| label: fig-x\n``` ```` | Quarto code cells / schema `cell-*` | Execution-oriented node exists | Phase 1 | Current phase: prepare-don’t-run authoring block. |
| Cell output options | `#| echo: false`, `#| warning: false` | `schema/cell-codeoutput.yml` | Completion seed | Phase 1 | First polished options: `label`, `fig-cap`, `echo`. |
| Cell figure options | `#| fig-cap: "Caption"` | `schema/cell-figure.yml` | Completion seed | Phase 1 | First caption path for code-generated figures. |
| Cell table options | `#| tbl-cap: "Caption"` | `schema/cell-table.yml` | Completion seed | Phase 5 | Needed for computed tables. |
| Cell layout options | `#| layout-ncol: 2` | `schema/cell-layout.yml` | Completion seed | Phase 2 / 5 | Used by figures, tables, and dashboards. |
| Cell include options | `#| file: script.py` | `schema/cell-include.yml` | Completion seed | Phase 8 | Project/file workflow dependent. |
| Callouts | `::: {.callout-note}` | Markdown basics / cross references | Custom node exists | Phase 2 | Types: note, tip, warning, caution, important. |
| Generic fenced divs | `::: {.class}\n...\n:::` | Markdown basics / Pandoc | Fenced-div plugin exists | Phase 2 | Base for many Quarto containers. |
| Tabsets/panels | `::: {.panel-tabset}` | Quarto authoring containers | Source fidelity | Phase 2 | Prose-native container UI. |
| Columns/layout divs | `:::: {.columns}` / layout attrs | Quarto layout docs / schema layout | Source fidelity | Phase 2 | Includes column and page layout semantics. |
| Citations | `[@smith2024]` | Quarto references/citations | Citation chip/plugin exists | Phase 3 | Hybrid picker already started; needs deeper UX. |
| Inline cross references | `@fig-plot`, `[-@tbl-data]` | Cross references | Completion seed | Phase 3 | Should autocomplete document symbols. |
| Cross-reference targets | `{#fig-x}`, `{#tbl-x}` | Cross references | Partial via existing attrs/plugins | Phase 3 | Includes labels for figures, tables, listings, callouts, equations, sections. |
| Bibliography declarations | `bibliography: refs.bib` | Reference metadata | Schema completion | Phase 3 | Document metadata, supports citation UI. |
| Markdown images | `![Alt](img.png){#fig-x}` | Markdown basics / cross references | Baseline Markdown | Phase 4 | Needs path autocomplete and caption/alt UI. |
| Figure divs | `::: {#fig-x}\n![](x.png)\nCaption\n:::` | Cross references | Source fidelity | Phase 4 | Supports captions and multi-content figures. |
| Subfigures | nested figures with labels/captions | Cross references | Source fidelity | Phase 4 | Requires grouped figure editor. |
| Lightbox/media options | `lightbox: true`, image attrs | `schema/document-lightbox.yml` / figures | Schema completion | Phase 4 | Usually document/figure option UI. |
| Pipe tables | `| A | B |\n|---|---|` | Tables | Baseline Markdown/GFM | Phase 5 | Semantic table editing later. |
| Table captions | `: Caption {#tbl-x}` | Tables / cross references | Source fidelity | Phase 5 | Important for scholarly docs. |
| Computed tables | code cell with `tbl-cap` | Tables / cell table schema | Completion seed | Phase 5 | Built on Phase 1 code-cell model. |
| Code listings | ```` ```{#lst-x .sql lst-cap="..."}```` | Cross references | Source fidelity | Phase 5 | Distinct from executable cells. |
| Display equations | `$$ ... $$ {#eq-x}` | Markdown basics / cross references | Math plugin | Phase 6 | Needs equation label/ref UX. |
| Inline math | `$x + y$` | Markdown basics | Math plugin | Always | Inline, not block roadmap except autocomplete. |
| Theorems and proofs | `::: {#thm-x}` / theorem divs | Cross references | Source fidelity | Phase 6 | Includes theorem-like prefixes. |
| Definitions/examples/exercises | `#def-`, `#exm-`, `#exr-` divs | Cross references | Source fidelity | Phase 6 | Formal block family. |
| Algorithms/remarks/solutions | `#alg-`, `#rem-`, `#sol-` divs | Cross references | Source fidelity | Phase 6 | Formal block family. |
| Mermaid diagrams | ```` ```{mermaid}```` | Markdown basics / document mermaid schema | Syntax highlighting | Phase 7 | Preview/render integration later. |
| Graphviz/DOT diagrams | DOT/Graphviz fenced code | Markdown basics / diagrams | Syntax highlighting | Phase 7 | Often code-fence based. |
| Observable/OJS blocks | ```` ```{ojs}```` | `schema/document-ojs.yml` | Syntax highlighting alias | Phase 7 | Reactive authoring later. |
| Includes | `{{< include file.qmd >}}` / include options | Quarto includes / schema | Source fidelity | Phase 8 | Requires project/file workflow. |
| Shortcodes | `{{< shortcode >}}` | Quarto authoring | Source fidelity | Phase 8 | Preserve first; semantic UI later. |
| HTML comments | `<!-- comment -->` | Markdown/Pandoc | Custom comment node exists | Phase 8 | Current UI exists; roadmap phase for polish. |
| Raw attribute blocks | `{=html}`, `{=latex}` | Pandoc Markdown | Source fidelity | Phase 8 | Format-specific. |
| Dashboard cards/layout | dashboard/card options | `schema/document-dashboard.yml`, `schema/cell-card.yml` | Schema completion | Phase 8 | Format-specific semantic UI. |
| Reveal slide blocks | slide fragments, columns, notes | `schema/document-reveal-*.yml` | Schema completion | Phase 8 | Presentation-specific. |
| Website/listing blocks | listing metadata/options | `schema/document-listing.yml`, website schema | Schema completion | Phase 8 | Project/website workflow dependent. |

## Non-Goals

- Format-level YAML options are schema/autocomplete work unless they map to a visible authoring construct.
- This roadmap does not promise render parity in each phase.
- The editor should preserve unknown Pandoc/Quarto syntax as source even before it has semantic UI.

