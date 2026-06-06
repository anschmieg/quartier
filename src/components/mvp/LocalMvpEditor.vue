<template>
  <div class="mvp-shell">
    <header class="mvp-header">
      <div>
        <p class="eyebrow">Local-first Quarto editor</p>
        <h1>Quartier</h1>
      </div>
      <div class="actions">
        <button
          type="button"
          class="secondary"
          data-testid="reset-document"
          @click="handleReset"
        >
          Reset
        </button>
        <button
          type="button"
          class="primary"
          data-testid="export-document"
          @click="handleExport"
        >
          Download .qmd
        </button>
      </div>
    </header>

    <main class="editor-panel">
      <div class="editor-heading">
        <div>
          <h2>quartier-document.qmd</h2>
          <p>Edit Quarto Markdown source directly. No account or server is required.</p>
        </div>
        <span class="save-status" aria-live="polite">{{ saveStatus }}</span>
      </div>

      <label class="sr-only" for="quarto-source">Quarto Markdown source</label>
      <textarea
        id="quarto-source"
        v-model="source"
        data-testid="source-editor"
        spellcheck="true"
        @input="persist"
      />

      <p class="storage-note">
        Your draft stays in this browser's local storage until you reset it or clear site data.
      </p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  createDocumentExport,
  loadDocument,
  resetDocument,
  saveDocument,
} from '@/services/localDocument'

const source = ref(loadDocument())
const saveStatus = ref('Saved locally')

function persist(): void {
  saveDocument(source.value)
  saveStatus.value = 'Saved locally'
}

function handleReset(): void {
  source.value = resetDocument()
  saveStatus.value = 'Reset and saved locally'
}

function handleExport(): void {
  const exported = createDocumentExport(source.value)
  const url = URL.createObjectURL(exported.blob)
  const link = document.createElement('a')

  link.href = url
  link.download = exported.filename
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.mvp-shell {
  min-height: 100vh;
  padding: 2rem;
  background:
    radial-gradient(circle at top left, rgba(45, 90, 74, 0.12), transparent 32rem),
    hsl(var(--background));
}

.mvp-header,
.editor-panel {
  width: min(100%, 72rem);
  margin-inline: auto;
}

.mvp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.eyebrow {
  margin: 0 0 0.25rem;
  color: hsl(var(--primary));
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 0;
  font-family: Newsreader, serif;
  font-size: clamp(2rem, 5vw, 3rem);
  line-height: 1;
}

.actions {
  display: flex;
  gap: 0.75rem;
}

button {
  padding: 0.65rem 1rem;
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

button.secondary {
  color: hsl(var(--foreground));
  background: hsl(var(--card));
}

button.primary {
  color: hsl(var(--primary-foreground));
  background: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

.editor-panel {
  padding: clamp(1rem, 3vw, 2rem);
  border: 1px solid hsl(var(--border));
  border-radius: calc(var(--radius) * 2);
  background: hsl(var(--card));
  box-shadow: 0 1.5rem 4rem rgba(38, 38, 38, 0.08);
}

.editor-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.editor-heading h2 {
  margin-bottom: 0.3rem;
  font-size: 1rem;
}

.editor-heading p,
.storage-note {
  color: hsl(var(--muted-foreground));
  font-size: 0.875rem;
}

.save-status {
  flex: none;
  color: hsl(var(--primary));
  font-size: 0.8rem;
  font-weight: 600;
}

textarea {
  display: block;
  width: 100%;
  min-height: 62vh;
  resize: vertical;
  padding: 1.25rem;
  border: 1px solid hsl(var(--input));
  border-radius: var(--radius);
  color: hsl(var(--foreground));
  background: hsl(var(--background));
  font: 0.95rem/1.65 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  tab-size: 2;
}

.storage-note {
  margin: 0.9rem 0 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 640px) {
  .mvp-shell {
    padding: 1rem;
  }

  .mvp-header,
  .editor-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .actions button {
    flex: 1;
  }
}
</style>
