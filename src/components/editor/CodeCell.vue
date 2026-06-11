<template>
  <div
    class="code-cell my-5 overflow-hidden rounded-2xl border border-amber-900/10 bg-[#fffdfa] shadow-sm transition"
    :class="{ 'ring-2 ring-amber-500/40': isSelected || optionsVisible }"
  >
    <div class="flex items-start justify-between gap-3 border-b border-amber-900/10 bg-[#fbf7ef] px-4 py-3" contenteditable="false">
      <div class="min-w-0 space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="rounded-full px-2.5 py-1 text-xs font-semibold"
            :class="languageClass"
            data-test="cell-language"
          >
            {{ displayLanguage }}
          </span>
          <span class="text-xs font-medium uppercase tracking-[0.2em] text-stone-400">
            Quarto code cell
          </span>
        </div>

        <div class="flex flex-wrap gap-2 text-xs text-stone-600">
          <span v-if="metadata.label" class="rounded-full bg-white px-2.5 py-1 font-mono" data-test="cell-label-summary">
            {{ metadata.label }}
          </span>
          <span v-if="metadata.figCap" class="rounded-full bg-white px-2.5 py-1" data-test="cell-caption-summary">
            {{ metadata.figCap }}
          </span>
          <span v-if="metadata.echo" class="rounded-full bg-white px-2.5 py-1 font-mono" data-test="cell-echo-summary">
            echo: {{ metadata.echo }}
          </span>
          <span v-if="!metadata.label && !metadata.figCap && !metadata.echo" class="text-stone-400">
            Add label, caption, or display options
          </span>
        </div>
      </div>

      <button
        type="button"
        data-test="edit-cell-options"
        class="min-h-9 shrink-0 rounded-full border border-stone-300 bg-white/70 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-white hover:text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        @click.stop="optionsVisible = !optionsVisible"
      >
        {{ optionsVisible ? 'Hide source options' : 'Edit source/options' }}
      </button>
    </div>

    <div v-if="optionsVisible" class="grid gap-3 border-b border-amber-900/10 bg-white/70 p-4" contenteditable="false">
      <label class="grid gap-1 text-xs font-medium text-stone-600">
        Label
        <input
          data-test="cell-label-input"
          class="rounded-lg border border-stone-200 bg-white px-3 py-2 font-mono text-sm text-stone-950 outline-hidden focus:border-amber-500"
          :value="metadata.label"
          placeholder="fig-example"
          @input="updateOption('label', ($event.target as HTMLInputElement).value)"
          @click.stop
          @keydown.stop
        >
      </label>

      <label class="grid gap-1 text-xs font-medium text-stone-600">
        Figure caption
        <input
          data-test="cell-fig-cap-input"
          class="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950 outline-hidden focus:border-amber-500"
          :value="metadata.figCap"
          placeholder="A short caption"
          @input="updateOption('fig-cap', ($event.target as HTMLInputElement).value)"
          @click.stop
          @keydown.stop
        >
      </label>

      <label class="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-600">
        Echo source in rendered output
        <input
          data-test="cell-echo-input"
          type="checkbox"
          :checked="metadata.echo !== 'false'"
          @change="updateOption('echo', ($event.target as HTMLInputElement).checked ? 'true' : 'false')"
          @click.stop
          @keydown.stop
        >
      </label>
    </div>

    <div
      :ref="contentRef"
      class="min-h-16 bg-[#fffdfa] p-4 font-mono text-sm text-stone-900 focus:outline-hidden"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useNodeViewContext } from '@prosemirror-adapter/vue'
import { parseCodeCellMetadata, updateCodeCellOption } from './code-cell-metadata'

const { node, contentRef, selected, view } = useNodeViewContext()
const optionsVisible = ref(false)

const metadata = computed(() => parseCodeCellMetadata(node.value.attrs?.language, node.value.textContent))
const isSelected = computed(() => selected.value)

const displayLanguage = computed(() => {
  switch (metadata.value.language) {
    case 'python':
      return 'Python'
    case 'r':
      return 'R'
    default:
      return metadata.value.language || 'Code'
  }
})

const languageClass = computed(() => {
  if (metadata.value.language === 'python') return 'bg-yellow-500/15 text-yellow-700'
  if (metadata.value.language === 'r') return 'bg-blue-500/15 text-blue-700'
  return 'bg-stone-200 text-stone-700'
})

function updateOption(name: 'label' | 'fig-cap' | 'echo', value: string) {
  const nextText = updateCodeCellOption(node.value.textContent, name, value)
  const tr = view.state.tr.insertText(nextText)
  view.dispatch(tr)
  view.focus()
}
</script>
