export const LEGACY_LOCAL_DOCUMENT_KEY = 'quartier.local-document.v1'
export const LOCAL_DOCUMENTS_KEY = 'quartier.local-documents.v2'

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

function saveCollection(collection: LocalDocumentCollection): LocalDocumentCollection {
  localStorage.setItem(LOCAL_DOCUMENTS_KEY, JSON.stringify(collection))
  return collection
}

export function loadDocumentCollection(): LocalDocumentCollection {
  const storedCollection = localStorage.getItem(LOCAL_DOCUMENTS_KEY)

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

  const legacySource = localStorage.getItem(LEGACY_LOCAL_DOCUMENT_KEY)
  const collection = saveCollection(createInitialCollection(legacySource ?? DEFAULT_DOCUMENT))

  if (legacySource !== null) {
    localStorage.removeItem(LEGACY_LOCAL_DOCUMENT_KEY)
  }

  return collection
}

export function getActiveDocument(collection: LocalDocumentCollection): LocalDocument {
  const activeDocument = collection.documents.find(
    document => document.id === collection.activeDocumentId,
  )

  return activeDocument ?? collection.documents[0]!
}

export function createDocument(): LocalDocumentCollection {
  const collection = loadDocumentCollection()
  const document = createLocalDocument()

  return saveCollection({
    ...collection,
    activeDocumentId: document.id,
    documents: [...collection.documents, document],
  })
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
  const collection = loadDocumentCollection()
  const updatedAt = createTimestamp()

  return saveCollection({
    ...collection,
    documents: collection.documents.map(document => document.id === documentId
      ? { ...document, source, updatedAt }
      : document),
  })
}

export function resetDocument(documentId: string): LocalDocumentCollection {
  return saveDocumentSource(documentId, DEFAULT_DOCUMENT)
}

export function renameDocument(documentId: string, title: string): LocalDocumentCollection {
  const collection = loadDocumentCollection()
  const normalizedTitle = title.trim() || DEFAULT_DOCUMENT_TITLE
  const updatedAt = createTimestamp()

  return saveCollection({
    ...collection,
    documents: collection.documents.map(document => document.id === documentId
      ? { ...document, title: normalizedTitle, updatedAt }
      : document),
  })
}

export function duplicateDocument(documentId: string): LocalDocumentCollection {
  const collection = loadDocumentCollection()
  const original = collection.documents.find(document => document.id === documentId)

  if (!original) {
    return collection
  }

  const duplicate = createLocalDocument(`${original.title} Copy`, original.source)

  return saveCollection({
    ...collection,
    activeDocumentId: duplicate.id,
    documents: [...collection.documents, duplicate],
  })
}

export function deleteDocument(documentId: string): LocalDocumentCollection {
  const collection = loadDocumentCollection()
  const documentIndex = collection.documents.findIndex(document => document.id === documentId)

  if (documentIndex === -1) {
    return collection
  }

  const remainingDocuments = collection.documents.filter(document => document.id !== documentId)

  if (remainingDocuments.length === 0) {
    const replacement = createLocalDocument()
    return saveCollection({
      version: 2,
      activeDocumentId: replacement.id,
      documents: [replacement],
    })
  }

  const activeDocumentId = collection.activeDocumentId === documentId
    ? remainingDocuments[Math.min(documentIndex, remainingDocuments.length - 1)]!.id
    : collection.activeDocumentId

  return saveCollection({
    ...collection,
    activeDocumentId,
    documents: remainingDocuments,
  })
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
  const collection = loadDocumentCollection()
  const document = createLocalDocument(imported.title, imported.source)

  return saveCollection({
    ...collection,
    activeDocumentId: document.id,
    documents: [...collection.documents, document],
  })
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
