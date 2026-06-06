<template>
  <section class="preview-panel" aria-label="Document preview" data-testid="preview-panel">
    <div v-if="source.trim()" class="preview-content" v-html="html" />
    <div v-else class="preview-empty">
      <h2>Nothing to preview</h2>
      <p>Add Markdown source to this document to see a local preview.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { renderLocalPreview } from '@/services/localPreview'

const props = defineProps<{
  source: string
}>()

const html = computed(() => renderLocalPreview(props.source))
</script>

<style scoped>
.preview-panel {
  min-width: 0;
  min-height: 58vh;
  padding: clamp(1.25rem, 3vw, 2.25rem);
  overflow: auto;
  border: 1px solid hsl(var(--input));
  border-radius: var(--radius);
  background: hsl(var(--background));
}

.preview-content {
  max-width: 48rem;
  margin-inline: auto;
  line-height: 1.7;
}

.preview-content :deep(h1),
.preview-content :deep(h2),
.preview-content :deep(h3),
.preview-content :deep(h4),
.preview-content :deep(h5),
.preview-content :deep(h6) {
  margin: 1.5em 0 0.55em;
  font-family: Newsreader, serif;
  line-height: 1.15;
}

.preview-content :deep(h1:first-child),
.preview-content :deep(.preview-metadata:first-child + h1) {
  margin-top: 0;
}

.preview-content :deep(p),
.preview-content :deep(ul),
.preview-content :deep(ol),
.preview-content :deep(blockquote),
.preview-content :deep(pre) {
  margin: 0 0 1rem;
}

.preview-content :deep(a) {
  color: hsl(var(--primary));
  text-decoration: underline;
  text-underline-offset: 0.18em;
}

.preview-content :deep(code) {
  padding: 0.15em 0.35em;
  border-radius: 0.3rem;
  background: hsl(var(--muted));
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.9em;
}

.preview-content :deep(pre) {
  padding: 1rem;
  overflow-x: auto;
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  background: hsl(var(--muted));
}

.preview-content :deep(pre code) {
  padding: 0;
  background: transparent;
}

.preview-content :deep(blockquote) {
  padding-left: 1rem;
  border-left: 0.25rem solid hsl(var(--primary));
  color: hsl(var(--muted-foreground));
}

.preview-content :deep(hr) {
  margin: 1.5rem 0;
  border: 0;
  border-top: 1px solid hsl(var(--border));
}

.preview-content :deep(.preview-metadata) {
  margin-bottom: 1.75rem;
  padding: 1rem;
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  background: hsl(var(--card));
}

.preview-content :deep(.preview-metadata h2) {
  margin: 0 0 0.75rem;
  font: 600 0.75rem/1.2 Inter, sans-serif;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.preview-content :deep(.preview-metadata dl) {
  display: grid;
  gap: 0.45rem;
  margin: 0;
}

.preview-content :deep(.preview-metadata dl div) {
  display: grid;
  grid-template-columns: minmax(6rem, 0.3fr) 1fr;
  gap: 1rem;
}

.preview-content :deep(.preview-metadata dt) {
  font-weight: 600;
}

.preview-content :deep(.preview-metadata dd) {
  margin: 0;
  overflow-wrap: anywhere;
  color: hsl(var(--muted-foreground));
}

.preview-empty {
  display: grid;
  min-height: 50vh;
  place-content: center;
  text-align: center;
  color: hsl(var(--muted-foreground));
}

.preview-empty h2 {
  margin-bottom: 0.35rem;
  color: hsl(var(--foreground));
}

.preview-empty p {
  margin: 0;
}
</style>
