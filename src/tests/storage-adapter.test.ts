import { beforeEach, describe, expect, it } from 'vitest'
import {
  DocumentRevisionConflictError,
  InMemoryDocumentStorageAdapter,
  type DocumentStorageAdapter,
} from '@/services/documentStorage'
import {
  LocalStorageDocumentAdapter,
} from '@/services/localDocument'

async function exerciseAdapter(
  adapter: DocumentStorageAdapter,
  documentId: string,
): Promise<void> {
  const before = await adapter.list()
  const created = await adapter.create({
    id: documentId,
    title: 'Adapter contract',
    source: '# Initial',
  })

  expect(created).toMatchObject({
    id: documentId,
    title: 'Adapter contract',
    source: '# Initial',
  })
  expect(created.revision).toEqual(expect.any(String))
  expect(await adapter.get(documentId)).toEqual(created)
  expect(await adapter.list()).toHaveLength(before.length + 1)

  const updated = await adapter.update(documentId, {
    title: 'Updated title',
    source: '# Updated',
    expectedRevision: created.revision,
  })
  expect(updated).toMatchObject({
    id: documentId,
    title: 'Updated title',
    source: '# Updated',
  })

  await adapter.delete(documentId)
  expect(await adapter.get(documentId)).toBeNull()
}

describe('document storage adapter contract', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('supports list/get/create/update/delete with the localStorage adapter', async () => {
    await exerciseAdapter(new LocalStorageDocumentAdapter(), 'local-contract-document')
  })

  it('supports the same contract with the in-memory adapter', async () => {
    await exerciseAdapter(new InMemoryDocumentStorageAdapter(), 'memory-contract-document')
  })
})

describe.each([
  ['localStorage', () => new LocalStorageDocumentAdapter() as DocumentStorageAdapter],
  ['memory', () => new InMemoryDocumentStorageAdapter() as DocumentStorageAdapter],
])('%s adapter revisions', (_name, createAdapter) => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('changes revisions only when title or source changes', async () => {
    const adapter = createAdapter()
    const created = await adapter.create({
      id: 'revision-document',
      title: 'Revision test',
      source: '# One',
    })
    const sameContent = await adapter.update(created.id, {
      title: created.title,
      source: created.source,
      expectedRevision: created.revision,
    })
    const sourceChanged = await adapter.update(created.id, {
      source: '# Two',
      expectedRevision: sameContent.revision,
    })
    const titleChanged = await adapter.update(created.id, {
      title: 'Renamed',
      expectedRevision: sourceChanged.revision,
    })

    expect(sameContent.revision).toBe(created.revision)
    expect(sourceChanged.revision).not.toBe(created.revision)
    expect(titleChanged.revision).not.toBe(sourceChanged.revision)
  })

  it('rejects an update against a stale revision', async () => {
    const adapter = createAdapter()
    const created = await adapter.create({
      id: 'stale-document',
      title: 'Revision test',
      source: '# One',
    })
    const updated = await adapter.update(created.id, {
      source: '# Two',
      expectedRevision: created.revision,
    })

    await expect(Promise.resolve().then(() => adapter.update(created.id, {
      source: '# Three',
      expectedRevision: created.revision,
    }))).rejects.toBeInstanceOf(DocumentRevisionConflictError)
    expect(await adapter.get(created.id)).toEqual(updated)
  })
})
