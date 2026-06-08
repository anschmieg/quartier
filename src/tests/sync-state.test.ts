import { beforeEach, describe, expect, it } from 'vitest'
import {
  InMemoryDocumentStorageAdapter,
  type UpdateDocumentInput,
} from '@/services/documentStorage'
import {
  DOCUMENT_SYNC_METADATA_KEY,
  DocumentSyncMetadataStore,
  writeDocumentToAdapter,
} from '@/services/documentSync'
import {
  LocalStorageDocumentAdapter,
  getActiveDocument,
  loadDocumentCollection,
  saveDocumentSource,
} from '@/services/localDocument'

describe('document sync metadata', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('persists metadata separately and supports all sync state transitions', () => {
    const document = getActiveDocument(loadDocumentCollection())
    const store = new DocumentSyncMetadataStore()

    expect(store.get(document.id).state).toBe('local-only')
    expect(localStorage.getItem(DOCUMENT_SYNC_METADATA_KEY)).not.toContain(document.source)

    const clean = store.markClean({
      ...document,
      revision: 'remote-1',
    }, 'test-provider', 'remote-document')
    expect(clean.state).toBe('clean')

    expect(store.markLocalChange({ ...document, source: '# Changed' }).state)
      .toBe('local-changes')
    expect(store.markSyncing(document.id).state).toBe('syncing')
    expect(store.markConflict(document.id, 'Both versions changed.').state).toBe('conflict')
    expect(store.markOffline(document.id).state).toBe('offline')
    expect(store.markError(document.id, new Error('Write failed.'))).toMatchObject({
      state: 'error',
      errorMessage: 'Write failed.',
    })

    const reloaded = new DocumentSyncMetadataStore()
    expect(reloaded.get(document.id)).toMatchObject({
      state: 'error',
      providerId: 'test-provider',
      remoteLocator: 'remote-document',
      lastSyncedRevision: 'remote-1',
      lastSyncedSource: document.source,
    })
  })

  it('returns to clean when local title and source match the last synced base', () => {
    const document = getActiveDocument(loadDocumentCollection())
    const store = new DocumentSyncMetadataStore()
    store.markClean({ ...document, revision: 'remote-1' }, 'test-provider', document.id)

    expect(store.markLocalChange(document).state).toBe('clean')
  })

  it('resets restored document IDs to local-only metadata', () => {
    const document = getActiveDocument(loadDocumentCollection())
    const store = new DocumentSyncMetadataStore()
    store.markClean({ ...document, revision: 'remote-1' }, 'test-provider', document.id)

    store.resetDocuments([document.id])

    expect(store.get(document.id)).toMatchObject({
      documentId: document.id,
      state: 'local-only',
    })
    expect(store.get(document.id).providerId).toBeUndefined()
  })
})

describe('failed adapter writes', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('preserves the local source and records an error state', async () => {
    const localAdapter = new LocalStorageDocumentAdapter()
    const document = getActiveDocument(loadDocumentCollection())
    const changedSource = '# Unsynced local work'
    saveDocumentSource(document.id, changedSource)
    const changedDocument = getActiveDocument(loadDocumentCollection())
    const metadata = new DocumentSyncMetadataStore()
    metadata.markClean({
      ...document,
      revision: 'remote-1',
    }, 'failing-provider', document.id)

    class FailingAdapter extends InMemoryDocumentStorageAdapter {
      override update(_documentId: string, _input: UpdateDocumentInput): never {
        throw new Error('Provider write failed.')
      }
    }

    await expect(writeDocumentToAdapter(
      changedDocument,
      new FailingAdapter('failing-provider'),
      metadata,
    )).rejects.toThrow('Provider write failed.')

    expect(localAdapter.get(document.id)?.source).toBe(changedSource)
    expect(metadata.get(document.id)).toMatchObject({
      state: 'error',
      errorMessage: 'Provider write failed.',
      lastSyncedSource: document.source,
    })
  })
})
