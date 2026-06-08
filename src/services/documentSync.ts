import type {
  DocumentStorageAdapter,
  StorageDocument,
  StoredDocument,
} from '@/services/documentStorage'
import { DocumentRevisionConflictError } from '@/services/documentStorage'
import {
  createDocumentConflict,
  parseDocumentConflict,
  type DocumentConflict,
} from '@/services/documentConflict'

export const DOCUMENT_SYNC_METADATA_KEY = 'quartier.document-sync-metadata.v1'

export type DocumentSyncState =
  | 'local-only'
  | 'clean'
  | 'local-changes'
  | 'syncing'
  | 'conflict'
  | 'offline'
  | 'error'

export interface DocumentSyncMetadata {
  documentId: string
  state: DocumentSyncState
  providerId?: string
  remoteLocator?: string
  lastSyncedRevision?: string
  lastSyncedSource?: string
  lastSyncedTitle?: string
  conflict?: Readonly<DocumentConflict>
  errorMessage?: string
  updatedAt: string
}

type SyncMetadataCollection = Record<string, DocumentSyncMetadata>

interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function timestamp(): string {
  return new Date().toISOString()
}

function isSyncState(value: unknown): value is DocumentSyncState {
  return value === 'local-only'
    || value === 'clean'
    || value === 'local-changes'
    || value === 'syncing'
    || value === 'conflict'
    || value === 'offline'
    || value === 'error'
}

function isMetadata(value: unknown): value is DocumentSyncMetadata {
  if (!value || typeof value !== 'object') {
    return false
  }

  const metadata = value as Partial<DocumentSyncMetadata>
  const hasValidConflict = metadata.conflict === undefined
    || parseDocumentConflict(metadata.conflict) !== undefined
  return typeof metadata.documentId === 'string'
    && isSyncState(metadata.state)
    && typeof metadata.updatedAt === 'string'
    && hasValidConflict
}

export class DocumentSyncMetadataStore {
  private readonly storage: KeyValueStorage
  private readonly storageKey: string

  constructor(
    storage: KeyValueStorage = localStorage,
    storageKey = DOCUMENT_SYNC_METADATA_KEY,
  ) {
    this.storage = storage
    this.storageKey = storageKey
  }

  list(): DocumentSyncMetadata[] {
    return Object.values(this.load())
  }

  get(documentId: string): DocumentSyncMetadata {
    return this.load()[documentId] ?? {
      documentId,
      state: 'local-only',
      updatedAt: timestamp(),
    }
  }

  set(
    documentId: string,
    update: Partial<Omit<DocumentSyncMetadata, 'documentId' | 'updatedAt'>>,
  ): DocumentSyncMetadata {
    const collection = this.load()
    const metadata: DocumentSyncMetadata = {
      ...this.get(documentId),
      ...update,
      documentId,
      updatedAt: timestamp(),
    }

    collection[documentId] = metadata
    this.save(collection)
    return metadata
  }

  remove(documentId: string): void {
    const collection = this.load()
    delete collection[documentId]
    this.save(collection)
  }

  reconcileDocuments(documentIds: string[]): void {
    const current = this.load()
    const reconciled: SyncMetadataCollection = Object.fromEntries(
      documentIds.map((documentId): [string, DocumentSyncMetadata] => {
        const existing = current[documentId]
        return [documentId, existing ?? {
          documentId,
          state: 'local-only',
          updatedAt: timestamp(),
        }]
      }),
    )
    this.save(reconciled)
  }

  resetDocuments(documentIds: string[]): void {
    const reset: SyncMetadataCollection = Object.fromEntries(
      documentIds.map((documentId): [string, DocumentSyncMetadata] => [
        documentId,
        {
          documentId,
          state: 'local-only',
          updatedAt: timestamp(),
        },
      ]),
    )
    this.save(reset)
  }

  markLocalChange(document: Pick<StorageDocument, 'id' | 'title' | 'source'>): DocumentSyncMetadata {
    const current = this.get(document.id)
    if (!current.providerId) {
      return this.set(document.id, { state: 'local-only', errorMessage: undefined })
    }

    const state = current.lastSyncedSource === document.source
      && current.lastSyncedTitle === document.title
      ? 'clean'
      : 'local-changes'

    return this.set(document.id, { state, errorMessage: undefined })
  }

  markSyncing(documentId: string): DocumentSyncMetadata {
    return this.set(documentId, { state: 'syncing', errorMessage: undefined })
  }

  markClean(
    document: Pick<StoredDocument, 'id' | 'title' | 'source' | 'revision'>,
    providerId: string,
    remoteLocator: string,
  ): DocumentSyncMetadata {
    return this.set(document.id, {
      state: 'clean',
      providerId,
      remoteLocator,
      lastSyncedRevision: document.revision,
      lastSyncedSource: document.source,
      lastSyncedTitle: document.title,
      conflict: undefined,
      errorMessage: undefined,
    })
  }

  markConflict(
    documentId: string,
    conflictOrMessage?: Readonly<DocumentConflict> | string,
    message?: string,
  ): DocumentSyncMetadata {
    const conflict = typeof conflictOrMessage === 'string'
      ? undefined
      : conflictOrMessage
    const errorMessage = typeof conflictOrMessage === 'string'
      ? conflictOrMessage
      : message
    return this.set(documentId, { state: 'conflict', conflict, errorMessage })
  }

  markOffline(documentId: string, message?: string): DocumentSyncMetadata {
    return this.set(documentId, { state: 'offline', errorMessage: message })
  }

  markError(documentId: string, error: unknown): DocumentSyncMetadata {
    return this.set(documentId, {
      state: 'error',
      errorMessage: error instanceof Error ? error.message : 'Document sync failed.',
    })
  }

  private load(): SyncMetadataCollection {
    const stored = this.storage.getItem(this.storageKey)
    if (!stored) {
      return {}
    }

    try {
      const parsed: unknown = JSON.parse(stored)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {}
      }

      return Object.fromEntries(Object.entries(parsed)
        .filter(([, value]) => isMetadata(value))
        .map(([documentId, value]) => {
          const metadata = value as DocumentSyncMetadata
          return [documentId, {
            ...metadata,
            conflict: metadata.conflict
              ? parseDocumentConflict(metadata.conflict)
              : undefined,
          }]
        }))
    } catch {
      return {}
    }
  }

  private save(collection: SyncMetadataCollection): void {
    if (Object.keys(collection).length === 0) {
      this.storage.removeItem(this.storageKey)
      return
    }

    this.storage.setItem(this.storageKey, JSON.stringify(collection))
  }
}

export const documentSyncMetadata = new DocumentSyncMetadataStore()

export async function writeDocumentToAdapter(
  localDocument: StorageDocument,
  adapter: DocumentStorageAdapter,
  metadataStore: DocumentSyncMetadataStore = documentSyncMetadata,
): Promise<StoredDocument> {
  const metadata = metadataStore.markSyncing(localDocument.id)
  const remoteLocator = metadata.remoteLocator ?? localDocument.id

  try {
    const stored = await adapter.update(remoteLocator, {
      title: localDocument.title,
      source: localDocument.source,
      expectedRevision: metadata.lastSyncedRevision,
    })

    metadataStore.markClean(
      { ...stored, id: localDocument.id },
      adapter.id,
      remoteLocator,
    )
    return stored
  } catch (error) {
    if (error instanceof DocumentRevisionConflictError) {
      let remoteDocument = error.remoteDocument
      if (!remoteDocument) {
        try {
          remoteDocument = await adapter.get(remoteLocator) ?? undefined
        } catch {
          metadataStore.markError(localDocument.id, error)
          throw error
        }
      }

      if (remoteDocument
        && metadata.lastSyncedRevision
        && metadata.lastSyncedSource !== undefined
        && metadata.lastSyncedTitle !== undefined) {
        const conflict = createDocumentConflict({
          documentId: localDocument.id,
          providerId: adapter.id,
          remoteLocator,
          base: {
            title: metadata.lastSyncedTitle,
            source: metadata.lastSyncedSource,
            revision: metadata.lastSyncedRevision,
          },
          local: {
            id: localDocument.id,
            title: localDocument.title,
            source: localDocument.source,
          },
          remote: {
            id: remoteDocument.id,
            title: remoteDocument.title,
            source: remoteDocument.source,
            revision: remoteDocument.revision,
          },
        })
        metadataStore.markConflict(localDocument.id, conflict, error.message)
        throw error
      }
    }

    metadataStore.markError(localDocument.id, error)
    throw error
  }
}
