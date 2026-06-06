import { beforeEach, describe, expect, it } from 'vitest'
import {
  createAcceptRemoteRequest,
  createDocumentConflict,
  createKeepLocalCommitRequest,
  createManualResolutionDraft,
} from '@/services/documentConflict'
import {
  InMemoryDocumentStorageAdapter,
} from '@/services/documentStorage'
import {
  DocumentSyncMetadataStore,
  writeDocumentToAdapter,
} from '@/services/documentSync'
import {
  LocalStorageDocumentAdapter,
  getActiveDocument,
  loadDocumentCollection,
  saveDocumentSource,
} from '@/services/localDocument'

describe('document conflict recovery', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('creates and reloads stale-revision conflict details without changing local source', async () => {
    const localAdapter = new LocalStorageDocumentAdapter()
    const original = getActiveDocument(loadDocumentCollection())
    const remoteAdapter = new InMemoryDocumentStorageAdapter('test-provider')
    const remoteBase = remoteAdapter.create({
      id: 'remote-document',
      title: original.title,
      source: original.source,
    })
    const metadata = new DocumentSyncMetadataStore()
    metadata.markClean(
      { ...remoteBase, id: original.id },
      remoteAdapter.id,
      remoteBase.id,
    )

    const remoteCurrent = remoteAdapter.update(remoteBase.id, {
      source: '# Remote change',
      expectedRevision: remoteBase.revision,
    })
    const localSource = '# Unsynced local change'
    saveDocumentSource(original.id, localSource)
    const localCurrent = getActiveDocument(loadDocumentCollection())

    await expect(writeDocumentToAdapter(
      localCurrent,
      remoteAdapter,
      metadata,
    )).rejects.toThrow('has changed since it was read')

    expect(localAdapter.get(original.id)?.source).toBe(localSource)
    expect(metadata.get(original.id)).toMatchObject({
      state: 'conflict',
      providerId: remoteAdapter.id,
      remoteLocator: remoteBase.id,
      conflict: {
        base: {
          title: original.title,
          source: original.source,
          revision: remoteBase.revision,
        },
        local: {
          id: original.id,
          title: original.title,
          source: localSource,
        },
        remote: {
          id: remoteBase.id,
          title: remoteCurrent.title,
          source: remoteCurrent.source,
          revision: remoteCurrent.revision,
        },
      },
    })

    const reloaded = new DocumentSyncMetadataStore()
    expect(reloaded.get(original.id).conflict).toEqual(metadata.get(original.id).conflict)
    expect(Object.isFrozen(reloaded.get(original.id).conflict)).toBe(true)
    expect(Object.isFrozen(reloaded.get(original.id).conflict?.remote)).toBe(true)
  })

  it('builds an accept-remote request with a local recovery copy first', () => {
    const conflict = fixtureConflict()

    expect(createAcceptRemoteRequest(conflict)).toEqual({
      kind: 'accept-remote',
      documentId: 'local-document',
      recoveryCopy: {
        kind: 'create-local-recovery-copy',
        title: 'Draft (recovery copy)',
        source: '# Local',
      },
      replacement: {
        kind: 'replace-local-with-remote',
        documentId: 'local-document',
        title: 'Draft',
        source: '# Remote',
        remoteRevision: 'remote-2',
      },
    })
  })

  it('builds a keep-local remote commit request against the current remote revision', () => {
    const conflict = fixtureConflict()

    expect(createKeepLocalCommitRequest(conflict)).toEqual({
      kind: 'keep-local',
      documentId: 'local-document',
      providerId: 'test-provider',
      remoteLocator: 'remote-document',
      expectedRevision: 'remote-2',
      title: 'Draft',
      source: '# Local',
    })
  })

  it('builds a manual resolution draft without mutating conflict inputs', () => {
    const conflict = fixtureConflict()
    const before = JSON.stringify(conflict)

    expect(createManualResolutionDraft(conflict)).toEqual({
      kind: 'manual-resolution',
      documentId: 'local-document',
      title: 'Draft',
      source: '# Local',
      baseRevision: 'remote-1',
      remoteRevision: 'remote-2',
    })
    expect(JSON.stringify(conflict)).toBe(before)
    expect(Object.isFrozen(conflict)).toBe(true)
    expect(Object.isFrozen(conflict.local)).toBe(true)
  })
})

function fixtureConflict() {
  return createDocumentConflict({
    documentId: 'local-document',
    providerId: 'test-provider',
    remoteLocator: 'remote-document',
    base: {
      title: 'Draft',
      source: '# Base',
      revision: 'remote-1',
    },
    local: {
      id: 'local-document',
      title: 'Draft',
      source: '# Local',
    },
    remote: {
      id: 'remote-document',
      title: 'Draft',
      source: '# Remote',
      revision: 'remote-2',
    },
  })
}
