<template>
  <div
    class="fenced-div"
    :class="`fenced-div-${kind}`"
    :id="node.attrs?.id"
    data-type="fenced-div"
  >
    <div class="fenced-div-toolbar" contenteditable="false">
      <div>
        <p class="fenced-div-eyebrow">Quarto container</p>
        <strong>{{ label }}</strong>
      </div>
      <code>{{ sourcePreview }}</code>
    </div>

    <div class="fenced-div-options" contenteditable="false">
      <label>
        Classes
        <input
          data-test="fenced-div-class-input"
          :value="classValue"
          @input="updateAttr('class', ($event.target as HTMLInputElement).value)"
          @click.stop
          @keydown.stop
        >
      </label>
      <label>
        ID
        <input
          :value="idValue"
          @input="updateAttr('id', ($event.target as HTMLInputElement).value)"
          @click.stop
          @keydown.stop
        >
      </label>
    </div>

    <div class="fenced-div-content" :ref="contentRef" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNodeViewContext } from '@prosemirror-adapter/vue'
import {
  classifyFencedDiv,
  serializeFencedDivDirective,
  type FencedDivMetadata,
} from './metadata'

const { node, contentRef, view, getPos } = useNodeViewContext()

const metadata = computed<FencedDivMetadata>(() => ({
  id: node.value.attrs?.id || undefined,
  classes: (node.value.attrs?.class || '').split(/\s+/).filter(Boolean),
  style: node.value.attrs?.style || undefined,
  attributes: node.value.attrs?.attributes || {},
}))

const kind = computed(() => classifyFencedDiv(metadata.value))
const label = computed(() => {
  if (kind.value === 'tabset') return 'Tabset'
  if (kind.value === 'columns') return 'Columns'
  return 'Div'
})
const classValue = computed(() => metadata.value.classes.join(' '))
const idValue = computed(() => metadata.value.id || '')
const sourcePreview = computed(() => serializeFencedDivDirective(metadata.value))

function updateAttr(key: string, value: string) {
  const pos = getPos?.()
  if (typeof pos !== 'number') return
  const normalized = value.trim()
  const tr = view.state.tr
  tr.setNodeAttribute(pos, key, normalized)
  view.dispatch(tr)
}
</script>

<style scoped>
.fenced-div {
  margin: 1.25rem 0;
  overflow: hidden;
  border: 1px solid rgba(120, 113, 108, 0.2);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.58);
}

.fenced-div-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(120, 113, 108, 0.16);
  color: rgb(68, 64, 60);
}

.fenced-div-toolbar code {
  max-width: 58%;
  overflow: hidden;
  color: rgb(87, 83, 78);
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fenced-div-eyebrow {
  margin: 0;
  color: rgb(120, 113, 108);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.fenced-div-options {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(120, 113, 108, 0.12);
}

.fenced-div-options label {
  display: grid;
  gap: 0.25rem;
  flex: 1;
  color: rgb(120, 113, 108);
  font-size: 0.75rem;
}

.fenced-div-options input {
  border: 1px solid rgba(120, 113, 108, 0.24);
  border-radius: 0.5rem;
  padding: 0.35rem 0.5rem;
  color: rgb(68, 64, 60);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.78rem;
}

.fenced-div-content {
  padding: 1rem;
}

.fenced-div-tabset {
  border-color: rgba(37, 99, 235, 0.24);
}

.fenced-div-columns {
  border-color: rgba(146, 64, 14, 0.24);
}
</style>
