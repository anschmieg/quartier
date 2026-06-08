<template>
  <div class="min-h-screen bg-[#f7f1e7] text-stone-950">
    <section
      v-if="!hasDocument"
      data-test="writer-start"
      class="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16"
    >
      <p class="mb-5 text-sm font-medium uppercase tracking-[0.32em] text-amber-800/70">
        Quartier local-first MVP
      </p>
      <h1 class="max-w-3xl font-serif text-5xl leading-tight tracking-[-0.04em] text-stone-950 md:text-7xl">
        Quarto finally flows.
      </h1>
      <p class="mt-7 max-w-2xl text-lg leading-8 text-stone-700">
        A calm single-document writing surface for research papers, reports, notebooks, and technical articles. Open a .qmd, write with less syntax friction, and keep your source portable.
      </p>

      <div class="mt-10 flex flex-wrap gap-3">
        <button
          type="button"
          data-test="open-document"
          class="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 shadow-sm transition hover:bg-stone-800"
          @click="openPicker"
        >
          Open a .qmd
        </button>
        <button
          type="button"
          data-test="new-document"
          class="rounded-full border border-stone-300 bg-white/60 px-5 py-3 text-sm font-semibold text-stone-900 shadow-sm transition hover:bg-white"
          @click="createBlankDocument"
        >
          New Quarto document
        </button>
      </div>

      <div class="mt-14 grid gap-4 md:grid-cols-3">
        <article class="rounded-3xl border border-amber-900/10 bg-white/45 p-5 shadow-sm">
          <h2 class="font-semibold">Autocomplete-first</h2>
          <p class="mt-2 text-sm leading-6 text-stone-600">Inline help for citations, YAML, chunk options, refs, callouts, figures, tables, and snippets.</p>
        </article>
        <article class="rounded-3xl border border-amber-900/10 bg-white/45 p-5 shadow-sm">
          <h2 class="font-semibold">Semantic blocks</h2>
          <p class="mt-2 text-sm leading-6 text-stone-600">Code cells and Quarto constructs read cleanly at rest, then reveal source precision on focus.</p>
        </article>
        <article class="rounded-3xl border border-amber-900/10 bg-white/45 p-5 shadow-sm">
          <h2 class="font-semibold">Local safety</h2>
          <p class="mt-2 text-sm leading-6 text-stone-600">Autosave in the browser, export anytime, and no cloud dependency for the first writing loop.</p>
        </article>
      </div>
    </section>

    <section v-else data-test="writer-shell" class="flex h-screen flex-col">
      <header class="flex h-16 items-center justify-between border-b border-stone-200/80 bg-[#fbf7ef]/90 px-5 backdrop-blur">
        <div class="min-w-0">
          <p data-test="document-title" class="truncate text-sm font-semibold text-stone-950">{{ documentName }}</p>
          <p data-test="save-state" class="text-xs text-stone-500">{{ saveStateLabel }}</p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            data-test="insert-callout"
            class="rounded-full px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-200/60 hover:text-stone-950"
            @click="insertCallout"
          >
            Insert callout
          </button>
          <button
            type="button"
            data-test="insert-tabset"
            class="rounded-full px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-200/60 hover:text-stone-950"
            @click="insertFencedDiv('tabset')"
          >
            Insert tabset
          </button>
          <button
            type="button"
            data-test="insert-columns"
            class="rounded-full px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-200/60 hover:text-stone-950"
            @click="insertFencedDiv('columns')"
          >
            Insert columns
          </button>
          <button
            type="button"
            data-test="preview-toggle"
            class="rounded-full px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-200/60 hover:text-stone-950"
            @click="showPreview = !showPreview"
          >
            {{ showPreview ? 'Hide preview' : 'Preview' }}
          </button>
          <button
            type="button"
            data-test="export-document"
            class="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-stone-50 transition hover:bg-stone-800"
            @click="exportDocument"
          >
            Export .qmd
          </button>
        </div>
      </header>

      <main class="grid min-h-0 flex-1" :class="showPreview ? 'grid-cols-[minmax(0,1fr)_minmax(320px,42vw)]' : 'grid-cols-1'">
        <div class="min-h-0 overflow-hidden">
          <div class="mx-auto h-full max-w-4xl px-5 py-8">
            <div class="mb-4 flex items-center justify-between rounded-full border border-amber-900/10 bg-white/55 px-4 py-2 text-xs text-stone-600">
              <span>Autocomplete-first Quarto writer</span>
              <span data-test="document-stats">{{ documentStats.words }} words · {{ documentStats.characters }} characters</span>
            </div>
            <div class="h-[calc(100%-3rem)] overflow-hidden rounded-[2rem] border border-amber-900/10 bg-[#fffdfa] shadow-sm">
              <EditorWrapper
                ref="editorWrapper"
                :initial-content="content"
                mode="visual"
                :filename="documentName"
                @update:content="updateContent"
              />
            </div>
          </div>
        </div>

        <aside v-if="showPreview" class="min-h-0 overflow-auto border-l border-stone-200/80 bg-white px-6 py-8">
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">On-demand preview</p>
          <h2 class="mt-3 font-serif text-3xl tracking-[-0.03em]">Local writing preview</h2>
          <div
            v-if="sourceDiagnostics.length"
            data-test="source-diagnostics"
            class="mt-5 space-y-2"
          >
            <p
              v-for="diagnostic in sourceDiagnostics"
              :key="diagnostic.message"
              class="rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            >
              {{ diagnostic.message }}
            </p>
          </div>
          <article
            data-test="rendered-preview"
            class="prose prose-stone mt-6 max-w-none rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"
            v-html="renderedPreview"
          />
        </aside>
      </main>
    </section>

    <input
      ref="fileInput"
      class="hidden"
      type="file"
      accept=".qmd,.md,.rmd,text/markdown,text/plain"
      @change="handleFileSelected"
    >
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import EditorWrapper from '@/components/editor/EditorWrapper.vue'
import { getSourceDiagnostics, renderLocalPreview } from '@/services/localPreview'

const autosaveKey = 'quartier:offline-writer-document'
const defaultDocumentName = 'Untitled.qmd'
const defaultContent = `---
title: "Untitled"
format: html
bibliography: references.bib
---

# Introduction

Start writing. Type citations, callouts, code cells, and cross-references with Quarto-aware help.

\`\`\`{python}
#| label: fig-example
#| fig-cap: "Example figure"

\`\`\`
`

const content = ref('')
const documentName = ref(defaultDocumentName)
const hasDocument = ref(false)
const showPreview = ref(false)
const savedAt = ref<number | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const editorWrapper = ref<InstanceType<typeof EditorWrapper> | null>(null)
const documentStats = computed(() => {
  const trimmedContent = content.value.trim()
  return {
    words: trimmedContent ? trimmedContent.split(/\s+/).length : 0,
    characters: content.value.length,
  }
})
const renderedPreview = computed(() => renderLocalPreview(content.value))
const sourceDiagnostics = computed(() => getSourceDiagnostics(content.value))

const saveStateLabel = computed(() => {
  if (!savedAt.value) return 'Autosave ready'
  return `Autosaved locally ${new Date(savedAt.value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
})

onMounted(() => {
  const saved = window.localStorage.getItem(autosaveKey)
  if (!saved) return

  try {
    const parsed = JSON.parse(saved) as { name?: string; content?: string; savedAt?: number }
    if (parsed.content) {
      content.value = parsed.content
      documentName.value = parsed.name || defaultDocumentName
      savedAt.value = parsed.savedAt || null
      hasDocument.value = true
    }
  } catch {
    window.localStorage.removeItem(autosaveKey)
  }
})

watch([content, documentName, hasDocument], () => {
  if (!hasDocument.value) return
  savedAt.value = Date.now()
  window.localStorage.setItem(autosaveKey, JSON.stringify({
    name: documentName.value,
    content: content.value,
    savedAt: savedAt.value,
  }))
})

function createBlankDocument() {
  documentName.value = defaultDocumentName
  content.value = defaultContent
  hasDocument.value = true
}

function updateContent(nextContent: string) {
  content.value = nextContent
}

function insertCallout() {
  if (editorWrapper.value?.insertCallout?.('note')) return
  const separator = content.value.endsWith('\n') ? '\n' : '\n\n'
  content.value = `${content.value}${separator}::: {.callout-note title="Note"}\n\n:::\n`
}

function getFencedDivSource(kind: string) {
  if (kind === 'tabset') return '::: {.panel-tabset}\n\n## Tab 1\n\n\n## Tab 2\n\n\n:::\n'
  if (kind === 'columns') return '::: {.columns}\n\n::: {.column width="50%"}\n\n\n:::\n\n::: {.column width="50%"}\n\n\n:::\n\n:::\n'
  return '::: {.custom}\n\n:::\n'
}

function insertFencedDiv(kind: string) {
  if (editorWrapper.value?.insertFencedDiv?.(kind)) return
  const separator = content.value.endsWith('\n') ? '\n' : '\n\n'
  content.value = `${content.value}${separator}${getFencedDivSource(kind)}`
}

function openPicker() {
  fileInput.value?.click()
}

async function handleFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  documentName.value = file.name
  content.value = await file.text()
  hasDocument.value = true
  input.value = ''
}

function exportDocument() {
  const blob = new Blob([content.value], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = documentName.value || defaultDocumentName
  link.click()
  URL.revokeObjectURL(url)
}
</script>
