import {
  DocumentNotFoundError,
  DocumentRevisionConflictError,
  createDocumentRevision,
  withDocumentRevision,
  type CreateDocumentInput,
  type DocumentStorageAdapter,
  type StoredDocument,
  type UpdateDocumentInput,
} from '@/services/documentStorage'
import { documentSyncMetadata } from '@/services/documentSync'

export const LEGACY_LOCAL_DOCUMENT_KEY = 'quartier.local-document.v1'
export const LOCAL_DOCUMENTS_KEY = 'quartier.local-documents.v2'
export const LOCAL_LIBRARY_BACKUP_FORMAT = 'quartier-local-library'
export const LOCAL_LIBRARY_BACKUP_VERSION = 1

export const DEFAULT_DOCUMENT_TITLE = 'Untitled Quartier Document'
export const DEFAULT_DOCUMENT = `---
title: "Untitled Quartier Document"
format: html
---

# Welcome to Quartier

Write Quarto Markdown here. This draft is saved in your browser automatically.
`

const SUPPORTED_IMPORT_EXTENSIONS = new Set(['qmd', 'md', 'markdown', 'txt'])

export interface LocalDocument {
  id: string
  title: string
  source: string
  createdAt: string
  updatedAt: string
}

export interface LocalDocumentCollection {
  version: 2
  activeDocumentId: string
  documents: LocalDocument[]
}

export interface DocumentExport {
  filename: string
  blob: Blob
}

export interface LocalLibraryBackup {
  format: typeof LOCAL_LIBRARY_BACKUP_FORMAT
  version: typeof LOCAL_LIBRARY_BACKUP_VERSION
  exportedAt: string
  activeDocumentId: string
  documents: LocalDocument[]
}

export interface ImportedDocument {
  title: string
  source: string
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? `document-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function createTimestamp(): string {
  return new Date().toISOString()
}

function createLocalDocument(
  title = DEFAULT_DOCUMENT_TITLE,
  source = DEFAULT_DOCUMENT,
): LocalDocument {
  const timestamp = createTimestamp()

  return {
    id: createId(),
    title,
    source,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function createInitialCollection(source = DEFAULT_DOCUMENT): LocalDocumentCollection {
  const document = createLocalDocument(DEFAULT_DOCUMENT_TITLE, source)

  return {
    version: 2,
    activeDocumentId: document.id,
    documents: [document],
  }
}

function isLocalDocument(value: unknown): value is LocalDocument {
  if (!value || typeof value !== 'object') {
    return false
  }

  const document = value as Partial<LocalDocument>
  return typeof document.id === 'string'
    && typeof document.title === 'string'
    && typeof document.source === 'string'
    && typeof document.createdAt === 'string'
    && typeof document.updatedAt === 'string'
}

function isValidTimestamp(value: string): boolean {
  return !Number.isNaN(Date.parse(value))
}

function isLocalDocumentCollection(value: unknown): value is LocalDocumentCollection {
  if (!value || typeof value !== 'object') {
    return false
  }

  const collection = value as Partial<LocalDocumentCollection>
  return collection.version === 2
    && typeof collection.activeDocumentId === 'string'
    && Array.isArray(collection.documents)
    && collection.documents.length > 0
    && collection.documents.every(isLocalDocument)
    && collection.documents.some(document => document.id === collection.activeDocumentId)
}

function isValidBackupDocument(value: unknown): value is LocalDocument {
  return isLocalDocument(value)
    && value.id.length > 0
    && isValidTimestamp(value.createdAt)
    && isValidTimestamp(value.updatedAt)
}

function isLocalLibraryBackup(value: unknown): value is LocalLibraryBackup {
  if (!value || typeof value !== 'object') {
    return false
  }

  const backup = value as Partial<LocalLibraryBackup>
  if (backup.format !== LOCAL_LIBRARY_BACKUP_FORMAT
    || backup.version !== LOCAL_LIBRARY_BACKUP_VERSION
    || typeof backup.exportedAt !== 'string'
    || !isValidTimestamp(backup.exportedAt)
    || typeof backup.activeDocumentId !== 'string'
    || !Array.isArray(backup.documents)
    || backup.documents.length === 0
    || !backup.documents.every(isValidBackupDocument)) {
    return false
  }

  const documentIds = backup.documents.map(document => document.id)
  return new Set(documentIds).size === documentIds.length
    && documentIds.includes(backup.activeDocumentId)
}

export class LocalStorageDocumentAdapter implements DocumentStorageAdapter {
  readonly id = 'local'
  private readonly storage: Storage

  constructor(storage: Storage = localStorage) {
    this.storage = storage
  }

  loadCollection(): LocalDocumentCollection {
    const storedCollection = this.storage.getItem(LOCAL_DOCUMENTS_KEY)

    if (storedCollection) {
      try {
        const parsed: unknown = JSON.parse(storedCollection)
        if (isLocalDocumentCollection(parsed)) {
          return parsed
        }
      } catch {
        // Replace invalid local data with a usable starter collection.
      }
    }

    const legacySource = this.storage.getItem(LEGACY_LOCAL_DOCUMENT_KEY)
    const collection = this.saveCollection(
      createInitialCollection(legacySource ?? DEFAULT_DOCUMENT),
    )

    if (legacySource !== null) {
      this.storage.removeItem(LEGACY_LOCAL_DOCUMENT_KEY)
    }

    return collection
  }

  saveCollection(collection: LocalDocumentCollection): LocalDocumentCollection {
    this.storage.setItem(LOCAL_DOCUMENTS_KEY, JSON.stringify(collection))
    return collection
  }

  list(): StoredDocument[] {
    return this.loadCollection().documents.map(withDocumentRevision)
  }

  get(documentId: string): StoredDocument | null {
    const document = this.loadCollection().documents.find(item => item.id === documentId)
    return document ? withDocumentRevision(document) : null
  }

  create(input: CreateDocumentInput): StoredDocument {
    const collection = this.loadCollection()
    const document = createLocalDocument(input.title, input.source)
    if (input.id) {
      document.id = input.id
    }

    if (collection.documents.some(item => item.id === document.id)) {
      throw new Error(`Document "${document.id}" already exists.`)
    }

    this.saveCollection({
      ...collection,
      activeDocumentId: document.id,
      documents: [...collection.documents, document],
    })
    return withDocumentRevision(document)
  }

  update(documentId: string, input: UpdateDocumentInput): StoredDocument {
    const collection = this.loadCollection()
    const existing = collection.documents.find(document => document.id === documentId)
    if (!existing) {
      throw new DocumentNotFoundError(documentId)
    }
    if (input.expectedRevision
      && input.expectedRevision !== createDocumentRevision(existing)) {
      throw new DocumentRevisionConflictError(documentId, withDocumentRevision(existing))
    }

    const updated: LocalDocument = {
      ...existing,
      title: input.title ?? existing.title,
      source: input.source ?? existing.source,
      updatedAt: createTimestamp(),
    }
    this.saveCollection({
      ...collection,
      documents: collection.documents.map(document => document.id === documentId
        ? updated
        : document),
    })
    return withDocumentRevision(updated)
  }

  delete(documentId: string): void {
    const collection = this.loadCollection()
    const documentIndex = collection.documents.findIndex(document => document.id === documentId)
    if (documentIndex === -1) {
      return
    }

    const remainingDocuments = collection.documents.filter(
      document => document.id !== documentId,
    )
    if (remainingDocuments.length === 0) {
      const replacement = createLocalDocument()
      this.saveCollection({
        version: 2,
        activeDocumentId: replacement.id,
        documents: [replacement],
      })
      return
    }

    const activeDocumentId = collection.activeDocumentId === documentId
      ? remainingDocuments[Math.min(documentIndex, remainingDocuments.length - 1)]!.id
      : collection.activeDocumentId

    this.saveCollection({
      ...collection,
      activeDocumentId,
      documents: remainingDocuments,
    })
  }
}

export const localDocumentAdapter = new LocalStorageDocumentAdapter()

function saveCollection(collection: LocalDocumentCollection): LocalDocumentCollection {
  return localDocumentAdapter.saveCollection(collection)
}

export function loadDocumentCollection(): LocalDocumentCollection {
  const collection = localDocumentAdapter.loadCollection()
  documentSyncMetadata.reconcileDocuments(collection.documents.map(document => document.id))
  return collection
}

export function getActiveDocument(collection: LocalDocumentCollection): LocalDocument {
  const activeDocument = collection.documents.find(
    document => document.id === collection.activeDocumentId,
  )

  return activeDocument ?? collection.documents[0]!
}

export function createDocument(): LocalDocumentCollection {
  localDocumentAdapter.create({
    title: DEFAULT_DOCUMENT_TITLE,
    source: DEFAULT_DOCUMENT,
  })
  return loadDocumentCollection()
}

export function switchDocument(documentId: string): LocalDocumentCollection {
  const collection = loadDocumentCollection()

  if (!collection.documents.some(document => document.id === documentId)) {
    return collection
  }

  return saveCollection({
    ...collection,
    activeDocumentId: documentId,
  })
}

export function saveDocumentSource(documentId: string, source: string): LocalDocumentCollection {
  localDocumentAdapter.update(documentId, { source })
  const collection = loadDocumentCollection()
  const document = collection.documents.find(item => item.id === documentId)
  if (document) {
    documentSyncMetadata.markLocalChange(document)
  }
  return collection
}

export function resetDocument(documentId: string): LocalDocumentCollection {
  return saveDocumentSource(documentId, DEFAULT_DOCUMENT)
}

export function renameDocument(documentId: string, title: string): LocalDocumentCollection {
  const normalizedTitle = title.trim() || DEFAULT_DOCUMENT_TITLE
  localDocumentAdapter.update(documentId, { title: normalizedTitle })
  const collection = loadDocumentCollection()
  const document = collection.documents.find(item => item.id === documentId)
  if (document) {
    documentSyncMetadata.markLocalChange(document)
  }
  return collection
}

export function duplicateDocument(documentId: string): LocalDocumentCollection {
  const collection = loadDocumentCollection()
  const original = collection.documents.find(document => document.id === documentId)

  if (!original) {
    return collection
  }

  localDocumentAdapter.create({
    title: `${original.title} Copy`,
    source: original.source,
  })
  return loadDocumentCollection()
}

export function deleteDocument(documentId: string): LocalDocumentCollection {
  localDocumentAdapter.delete(documentId)
  documentSyncMetadata.remove(documentId)
  return loadDocumentCollection()
}

export async function importDocumentFile(file: Pick<File, 'name' | 'text'>): Promise<ImportedDocument> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (!SUPPORTED_IMPORT_EXTENSIONS.has(extension)) {
    throw new Error('Choose a .qmd, .md, .markdown, or .txt file.')
  }

  const title = file.name.slice(0, -(extension.length + 1)).trim() || DEFAULT_DOCUMENT_TITLE

  return {
    title,
    source: await file.text(),
  }
}

export function addImportedDocument(imported: ImportedDocument): LocalDocumentCollection {
  localDocumentAdapter.create({
    title: imported.title,
    source: imported.source,
  })
  return loadDocumentCollection()
}

export function sanitizeFilename(title: string): string {
  const sanitized = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  return sanitized || 'quartier-document'
}

export function createDocumentExport(document: Pick<LocalDocument, 'title' | 'source'>): DocumentExport {
  return {
    filename: `${sanitizeFilename(document.title)}.qmd`,
    blob: new Blob([document.source], { type: 'text/markdown;charset=utf-8' }),
  }
}

export function createLibraryBackup(
  collection: LocalDocumentCollection = loadDocumentCollection(),
): LocalLibraryBackup {
  return {
    format: LOCAL_LIBRARY_BACKUP_FORMAT,
    version: LOCAL_LIBRARY_BACKUP_VERSION,
    exportedAt: createTimestamp(),
    activeDocumentId: collection.activeDocumentId,
    documents: collection.documents.map(document => ({ ...document })),
  }
}

export function createLibraryBackupExport(
  collection: LocalDocumentCollection = loadDocumentCollection(),
): DocumentExport {
  const backup = createLibraryBackup(collection)
  const date = backup.exportedAt.slice(0, 10)

  return {
    filename: `quartier-library-backup-${date}.json`,
    blob: new Blob(
      [`${JSON.stringify(backup, null, 2)}\n`],
      { type: 'application/json;charset=utf-8' },
    ),
  }
}

export async function restoreLibraryBackupFile(
  file: Pick<File, 'name' | 'text'>,
): Promise<LocalDocumentCollection> {
  if (!file.name.toLowerCase().endsWith('.json')) {
    throw new Error('Choose a Quartier library backup JSON file.')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new Error('This file is not valid JSON.')
  }

  if (parsed
    && typeof parsed === 'object'
    && (parsed as { format?: unknown }).format === LOCAL_LIBRARY_BACKUP_FORMAT
    && (parsed as { version?: unknown }).version !== LOCAL_LIBRARY_BACKUP_VERSION) {
    throw new Error('This backup version is not supported.')
  }

  if (!isLocalLibraryBackup(parsed)) {
    throw new Error('This backup does not contain a valid Quartier document library.')
  }

  const collection: LocalDocumentCollection = {
    version: 2,
    activeDocumentId: parsed.activeDocumentId,
    documents: parsed.documents.map(document => ({ ...document })),
  }

  try {
    const saved = saveCollection(collection)
    documentSyncMetadata.resetDocuments(saved.documents.map(document => document.id))
    return saved
  } catch {
    throw new Error('Quartier could not save the restored library in this browser.')
  }
}
