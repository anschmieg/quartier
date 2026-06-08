export type Awaitable<T> = T | Promise<T>

export interface StorageDocument {
  id: string
  title: string
  source: string
  createdAt: string
  updatedAt: string
}

export interface StoredDocument extends StorageDocument {
  revision: string
}

export interface CreateDocumentInput {
  id?: string
  title: string
  source: string
}

export interface UpdateDocumentInput {
  title?: string
  source?: string
  expectedRevision?: string
}

export interface DocumentStorageAdapter {
  readonly id: string
  list(): Awaitable<StoredDocument[]>
  get(documentId: string): Awaitable<StoredDocument | null>
  create(input: CreateDocumentInput): Awaitable<StoredDocument>
  update(documentId: string, input: UpdateDocumentInput): Awaitable<StoredDocument>
  delete(documentId: string): Awaitable<void>
}

export class DocumentNotFoundError extends Error {
  constructor(documentId: string) {
    super(`Document "${documentId}" was not found.`)
    this.name = 'DocumentNotFoundError'
  }
}

export class DocumentRevisionConflictError extends Error {
  readonly remoteDocument?: Readonly<StoredDocument>

  constructor(documentId: string, remoteDocument?: StoredDocument) {
    super(`Document "${documentId}" has changed since it was read.`)
    this.name = 'DocumentRevisionConflictError'
    this.remoteDocument = remoteDocument
      ? Object.freeze({ ...remoteDocument })
      : undefined
  }
}

export function createDocumentRevision(
  document: Pick<StorageDocument, 'title' | 'source'>,
): string {
  const value = `${document.title}\u0000${document.source}`
  let hash = 0x811c9dc5

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return `local-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export function withDocumentRevision(document: StorageDocument): StoredDocument {
  return {
    ...document,
    revision: createDocumentRevision(document),
  }
}

function memoryId(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? `document-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export class InMemoryDocumentStorageAdapter implements DocumentStorageAdapter {
  readonly id: string
  private readonly documents = new Map<string, StorageDocument>()

  constructor(id = 'memory', documents: StorageDocument[] = []) {
    this.id = id
    documents.forEach(document => this.documents.set(document.id, { ...document }))
  }

  list(): StoredDocument[] {
    return [...this.documents.values()].map(withDocumentRevision)
  }

  get(documentId: string): StoredDocument | null {
    const document = this.documents.get(documentId)
    return document ? withDocumentRevision(document) : null
  }

  create(input: CreateDocumentInput): StoredDocument {
    const id = input.id ?? memoryId()
    if (this.documents.has(id)) {
      throw new Error(`Document "${id}" already exists.`)
    }

    const createdAt = new Date().toISOString()
    const document: StorageDocument = {
      id,
      title: input.title,
      source: input.source,
      createdAt,
      updatedAt: createdAt,
    }
    this.documents.set(id, document)
    return withDocumentRevision(document)
  }

  update(documentId: string, input: UpdateDocumentInput): StoredDocument {
    const existing = this.documents.get(documentId)
    if (!existing) {
      throw new DocumentNotFoundError(documentId)
    }
    if (input.expectedRevision
      && input.expectedRevision !== createDocumentRevision(existing)) {
      throw new DocumentRevisionConflictError(documentId, withDocumentRevision(existing))
    }

    const updated: StorageDocument = {
      ...existing,
      title: input.title ?? existing.title,
      source: input.source ?? existing.source,
      updatedAt: new Date().toISOString(),
    }
    this.documents.set(documentId, updated)
    return withDocumentRevision(updated)
  }

  delete(documentId: string): void {
    this.documents.delete(documentId)
  }
}
