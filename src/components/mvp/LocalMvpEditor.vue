<template>
  <div class="mvp-shell">
    <header class="mvp-header">
      <div>
        <p class="eyebrow">Local-first Quarto editor</p>
        <h1>Quartier</h1>
      </div>
      <div class="header-actions">
        <button
          type="button"
          class="secondary"
          data-testid="backup-library"
          @click="handleBackup"
        >
          Backup library
        </button>
        <button
          type="button"
          class="secondary"
          data-testid="restore-library"
          @click="backupFileInput?.click()"
        >
          Restore backup
        </button>
        <input
          ref="backupFileInput"
          class="sr-only"
          type="file"
          accept=".json,application/json"
          data-testid="backup-file-input"
          @change="handleRestore"
        >
        <button
          type="button"
          class="secondary"
          data-testid="import-document"
          @click="fileInput?.click()"
        >
          Import
        </button>
        <input
          ref="fileInput"
          class="sr-only"
          type="file"
          accept=".qmd,.md,.markdown,.txt"
          data-testid="file-input"
          @change="handleImport"
        >
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

    <main class="workspace">
      <aside class="document-panel" aria-label="Local documents">
        <div class="document-panel-heading">
          <div>
            <h2>Documents</h2>
            <p>{{ collection.documents.length }} stored locally</p>
          </div>
          <button
            type="button"
            class="secondary compact"
            data-testid="create-document"
            @click="handleCreate"
          >
            New
          </button>
        </div>

        <div class="document-search">
          <label for="document-search">Search local documents</label>
          <input
            id="document-search"
            v-model="documentSearch"
            type="search"
            data-testid="document-search"
            placeholder="Search title or source"
          >
          <button
            v-if="documentSearch"
            type="button"
            class="secondary compact"
            data-testid="clear-document-search"
            @click="documentSearch = ''"
          >
            Clear
          </button>
        </div>

        <div class="document-list">
          <button
            v-for="document in filteredDocuments"
            :key="document.id"
            type="button"
            class="document-item"
            :class="{ active: document.id === activeDocument.id }"
            :data-document-id="document.id"
            @click="handleSwitch(document.id)"
          >
            <strong>{{ document.title }}</strong>
            <span>{{ document.id === activeDocument.id ? 'Active' : 'Open' }}</span>
          </button>
          <p
            v-if="filteredDocuments.length === 0"
            class="document-empty-state"
            data-testid="document-search-empty"
          >
            No local documents match “{{ normalizedDocumentSearch }}”.
          </p>
        </div>

        <p class="storage-note">
          Documents stay in this browser until you delete them or clear site data.
          Restoring a backup replaces this local library.
        </p>

        <section class="remote-storage" aria-labelledby="remote-storage-heading">
          <button
            type="button"
            class="remote-storage-toggle"
            data-testid="remote-storage-toggle"
            :aria-expanded="remoteStorageOpen"
            aria-controls="remote-storage-panel"
            @click="remoteStorageOpen = !remoteStorageOpen"
          >
            <span>
              <strong id="remote-storage-heading">Remote Storage</strong>
              <small>Optional. Local editing works without connecting.</small>
            </span>
            <span aria-hidden="true">{{ remoteStorageOpen ? '-' : '+' }}</span>
          </button>

          <div
            v-if="remoteStorageOpen"
            id="remote-storage-panel"
            class="remote-storage-panel"
            data-testid="remote-storage-panel"
          >
            <div class="remote-provider-heading">
              <div>
                <strong>{{ githubRemoteProvider.name }}</strong>
                <p>{{ githubRemoteProvider.description }}</p>
              </div>
              <span class="connection-status">{{ githubConnection.status }}</span>
            </div>
            <p>
              Connecting is opt-in. M4B defines the safe UI/API boundary only;
              live GitHub OAuth and sync are not enabled yet.
            </p>
            <button
              type="button"
              class="secondary compact"
              data-testid="connect-github"
              @click="handleGitHubConnect"
            >
              Connect GitHub
            </button>
            <p
              v-if="remoteMessage"
              class="remote-message"
              data-testid="remote-storage-message"
              role="status"
            >
              {{ remoteMessage }}
            </p>
          </div>
        </section>
      </aside>

      <section class="editor-panel">
        <div class="editor-heading">
          <div class="title-field">
            <label for="document-title">Document title</label>
            <input
              id="document-title"
              v-model="title"
              data-testid="document-title"
              type="text"
              @change="handleRename"
            >
          </div>
          <span class="save-status" aria-live="polite">{{ saveStatus }}</span>
        </div>

        <div class="document-actions">
          <div class="document-management-actions">
            <button
              type="button"
              class="secondary compact"
              data-testid="duplicate-document"
              @click="handleDuplicate"
            >
              Duplicate
            </button>
            <button
              type="button"
              class="secondary compact"
              data-testid="reset-document"
              @click="handleReset"
            >
              Reset content
            </button>
            <button
              type="button"
              class="danger compact"
              data-testid="delete-document"
              @click="handleDelete"
            >
              Delete
            </button>
          </div>

          <div class="view-switcher" aria-label="Editor view">
            <button
              v-for="option in viewOptions"
              :key="option.value"
              type="button"
              class="secondary compact"
              :class="{ selected: viewMode === option.value }"
              :aria-pressed="viewMode === option.value"
              :data-testid="`${option.value}-view`"
              @click="viewMode = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <p class="document-stats" data-testid="document-stats" aria-live="polite">
          {{ documentStats.words }} words · {{ documentStats.characters }} characters
        </p>

        <ul
          v-if="diagnostics.length"
          class="diagnostics"
          aria-label="Source diagnostics"
          data-testid="source-diagnostics"
        >
          <li
            v-for="diagnostic in diagnostics"
            :key="diagnostic.message"
            :class="diagnostic.severity"
          >
            <strong>{{ diagnostic.severity === 'error' ? 'Error' : 'Notice' }}:</strong>
            {{ diagnostic.message }}
          </li>
        </ul>

        <div class="editing-surface" :class="`mode-${viewMode}`">
          <div v-if="viewMode !== 'preview'" class="source-pane">
            <label class="sr-only" for="quarto-source">Quarto Markdown source</label>
            <textarea
              id="quarto-source"
              v-model="source"
              data-testid="source-editor"
              spellcheck="true"
              @input="persist"
            />
          </div>

          <LocalMarkdownPreview
            v-if="viewMode !== 'source'"
            class="preview-pane"
            :source="source"
          />
        </div>

        <p v-if="message" class="message" :class="{ error: messageIsError }" role="status">
          {{ message }}
        </p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import LocalMarkdownPreview from '@/components/mvp/LocalMarkdownPreview.vue'
import {
  githubRemoteClient,
  githubRemoteProvider,
} from '@/services/githubRemote'
import {
  addImportedDocument,
  createLibraryBackupExport,
  createDocument,
  createDocumentExport,
  deleteDocument,
  duplicateDocument,
  getActiveDocument,
  importDocumentFile,
  loadDocumentCollection,
  renameDocument,
  resetDocument,
  restoreLibraryBackupFile,
  saveDocumentSource,
  switchDocument,
  type LocalDocumentCollection,
} from '@/services/localDocument'
import { getSourceDiagnostics } from '@/services/localPreview'
import { createDisconnectedConnection } from '@/services/remoteConnection'

type ViewMode = 'source' | 'split' | 'preview'

const viewOptions: { label: string, value: ViewMode }[] = [
  { label: 'Source', value: 'source' },
  { label: 'Split', value: 'split' },
  { label: 'Preview', value: 'preview' },
]

const collection = ref<LocalDocumentCollection>(loadDocumentCollection())
const activeDocument = computed(() => getActiveDocument(collection.value))
const source = ref(activeDocument.value.source)
const diagnostics = computed(() => getSourceDiagnostics(source.value))
const title = ref(activeDocument.value.title)
const documentSearch = ref('')
const viewMode = ref<ViewMode>('split')
const saveStatus = ref('Saved locally')
const message = ref('')
const messageIsError = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const backupFileInput = ref<HTMLInputElement | null>(null)
const remoteStorageOpen = ref(false)
const githubConnection = ref(createDisconnectedConnection(githubRemoteProvider))
const remoteMessage = ref('')
const normalizedDocumentSearch = computed(() => documentSearch.value.trim())
const filteredDocuments = computed(() => {
  const query = normalizedDocumentSearch.value.toLowerCase()
  if (!query) {
    return collection.value.documents
  }

  return collection.value.documents.filter(document =>
    document.title.toLowerCase().includes(query)
    || document.source.toLowerCase().includes(query),
  )
})
const documentStats = computed(() => {
  const trimmedSource = source.value.trim()
  return {
    characters: source.value.length,
    words: trimmedSource ? trimmedSource.split(/\s+/).length : 0,
  }
})

function syncActiveDocument(status: string): void {
  source.value = activeDocument.value.source
  title.value = activeDocument.value.title
  saveStatus.value = status
}

function clearMessage(): void {
  message.value = ''
  messageIsError.value = false
}

function persist(): void {
  collection.value = saveDocumentSource(activeDocument.value.id, source.value)
  saveStatus.value = 'Saved locally'
}

function handleCreate(): void {
  collection.value = createDocument()
  syncActiveDocument('New document saved locally')
  clearMessage()
}

function handleSwitch(documentId: string): void {
  collection.value = switchDocument(documentId)
  syncActiveDocument('Saved locally')
  clearMessage()
}

function handleRename(): void {
  collection.value = renameDocument(activeDocument.value.id, title.value)
  syncActiveDocument('Title saved locally')
}

function handleDuplicate(): void {
  collection.value = duplicateDocument(activeDocument.value.id)
  syncActiveDocument('Duplicate saved locally')
  clearMessage()
}

function handleReset(): void {
  collection.value = resetDocument(activeDocument.value.id)
  syncActiveDocument('Content reset and saved locally')
  clearMessage()
}

function handleDelete(): void {
  collection.value = deleteDocument(activeDocument.value.id)
  syncActiveDocument('Document deleted locally')
  clearMessage()
}

async function handleImport(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  try {
    const imported = await importDocumentFile(file)
    collection.value = addImportedDocument(imported)
    syncActiveDocument('Imported and saved locally')
    message.value = `Imported ${file.name}`
    messageIsError.value = false
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Unable to import this file.'
    messageIsError.value = true
  } finally {
    input.value = ''
  }
}

function downloadExport(exported: { filename: string, blob: Blob }): void {
  const url = URL.createObjectURL(exported.blob)
  const link = document.createElement('a')

  link.href = url
  link.download = exported.filename
  link.click()
  URL.revokeObjectURL(url)
}

function handleExport(): void {
  downloadExport(createDocumentExport(activeDocument.value))
}

function handleBackup(): void {
  downloadExport(createLibraryBackupExport(collection.value))
  message.value = `Backed up ${collection.value.documents.length} document${collection.value.documents.length === 1 ? '' : 's'}`
  messageIsError.value = false
}

async function handleRestore(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  try {
    collection.value = await restoreLibraryBackupFile(file)
    syncActiveDocument('Library restored locally')
    message.value = `Restored ${collection.value.documents.length} document${collection.value.documents.length === 1 ? '' : 's'} from ${file.name}`
    messageIsError.value = false
  } catch (error) {
    message.value = error instanceof Error
      ? error.message
      : 'Quartier could not restore this backup.'
    messageIsError.value = true
  } finally {
    input.value = ''
  }
}

async function handleGitHubConnect(): Promise<void> {
  const result = await githubRemoteClient.connect({ returnPath: '/' })
  remoteMessage.value = result.message ?? 'GitHub connection is not available yet.'
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
.workspace {
  width: min(100%, 80rem);
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

h2 {
  margin-bottom: 0.2rem;
  font-size: 1rem;
}

.header-actions,
.document-management-actions,
.view-switcher {
  display: flex;
  flex-wrap: wrap;
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

button.danger {
  color: hsl(var(--destructive));
  background: hsl(var(--card));
  border-color: hsl(var(--destructive));
}

button.compact {
  padding: 0.45rem 0.7rem;
  font-size: 0.82rem;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(14rem, 18rem) minmax(0, 1fr);
  gap: 1rem;
}

.document-panel,
.editor-panel {
  border: 1px solid hsl(var(--border));
  border-radius: calc(var(--radius) * 2);
  background: hsl(var(--card));
  box-shadow: 0 1.5rem 4rem rgba(38, 38, 38, 0.06);
}

.document-panel {
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.document-panel-heading,
.editor-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.document-panel-heading p,
.storage-note,
.title-field label {
  color: hsl(var(--muted-foreground));
  font-size: 0.8rem;
}

.document-list {
  display: grid;
  gap: 0.5rem;
  margin-block: 1rem;
}

.document-search {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.5rem;
  margin-top: 1rem;
}

.document-search label {
  grid-column: 1 / -1;
  color: hsl(var(--muted-foreground));
  font-size: 0.8rem;
  font-weight: 600;
}

.document-search input {
  min-width: 0;
  padding: 0.5rem 0.65rem;
  border: 1px solid hsl(var(--input));
  border-radius: var(--radius);
  color: hsl(var(--foreground));
  background: hsl(var(--background));
  font: inherit;
}

.document-empty-state {
  margin: 0;
  padding: 0.75rem;
  border: 1px dashed hsl(var(--border));
  border-radius: var(--radius);
  color: hsl(var(--muted-foreground));
  font-size: 0.82rem;
}

.document-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem;
  text-align: left;
  color: hsl(var(--foreground));
  background: hsl(var(--background));
}

.document-item strong {
  overflow: hidden;
  font-size: 0.88rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.document-item span {
  color: hsl(var(--muted-foreground));
  font-size: 0.72rem;
}

.document-item.active {
  border-color: hsl(var(--primary));
  background: hsl(var(--secondary));
}

.storage-note {
  margin: auto 0 1rem;
}

.remote-storage {
  border-top: 1px solid hsl(var(--border));
  padding-top: 0.75rem;
}

.remote-storage-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 0.65rem 0;
  border: 0;
  text-align: left;
  color: hsl(var(--foreground));
  background: transparent;
}

.remote-storage-toggle span:first-child {
  display: grid;
  gap: 0.2rem;
}

.remote-storage-toggle small,
.remote-storage-panel p {
  color: hsl(var(--muted-foreground));
  font-size: 0.75rem;
  font-weight: 400;
}

.remote-storage-panel {
  padding: 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  background: hsl(var(--background));
}

.remote-provider-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.remote-provider-heading p,
.remote-storage-panel > p {
  margin-bottom: 0.75rem;
}

.connection-status {
  color: hsl(var(--muted-foreground));
  font-size: 0.7rem;
  text-transform: capitalize;
}

.remote-message {
  margin: 0.75rem 0 0;
}

.editor-panel {
  padding: clamp(1rem, 3vw, 2rem);
}

.editor-heading {
  margin-bottom: 0.75rem;
}

.title-field {
  flex: 1;
}

.title-field label {
  display: block;
  margin-bottom: 0.3rem;
  font-weight: 600;
}

.title-field input {
  width: min(100%, 32rem);
  padding: 0.55rem 0.7rem;
  border: 1px solid hsl(var(--input));
  border-radius: var(--radius);
  color: hsl(var(--foreground));
  background: hsl(var(--background));
  font: inherit;
  font-weight: 600;
}

.save-status {
  flex: none;
  color: hsl(var(--primary));
  font-size: 0.8rem;
  font-weight: 600;
}

.document-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.document-stats {
  margin: 0 0 1rem;
  color: hsl(var(--muted-foreground));
  font-size: 0.8rem;
}

.view-switcher {
  flex-wrap: nowrap;
  gap: 0.25rem;
  padding: 0.2rem;
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  background: hsl(var(--background));
}

.view-switcher button {
  border-color: transparent;
}

.view-switcher button.selected {
  border-color: hsl(var(--primary));
  background: hsl(var(--secondary));
}

.diagnostics {
  display: grid;
  gap: 0.35rem;
  margin: 0 0 1rem;
  padding: 0;
  list-style: none;
  font-size: 0.85rem;
}

.diagnostics li {
  padding: 0.65rem 0.8rem;
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  background: hsl(var(--secondary));
}

.diagnostics li.error {
  color: hsl(var(--destructive));
  border-color: hsl(var(--destructive));
}

.editing-surface {
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.editing-surface.mode-split {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.source-pane,
.preview-pane {
  min-width: 0;
}

.source-pane textarea {
  display: block;
  width: 100%;
  min-height: 58vh;
  resize: vertical;
  padding: 1.25rem;
  border: 1px solid hsl(var(--input));
  border-radius: var(--radius);
  color: hsl(var(--foreground));
  background: hsl(var(--background));
  font: 0.95rem/1.65 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  tab-size: 2;
}

.message {
  margin: 0.9rem 0 0;
  color: hsl(var(--primary));
  font-size: 0.85rem;
}

.message.error {
  color: hsl(var(--destructive));
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

@media (max-width: 760px) {
  .mvp-shell {
    padding: 1rem;
  }

  .mvp-header,
  .editor-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .workspace {
    grid-template-columns: 1fr;
  }

  .document-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .editing-surface.mode-split {
    grid-template-columns: 1fr;
  }

  .header-actions button {
    flex: 1;
  }
}
</style>
