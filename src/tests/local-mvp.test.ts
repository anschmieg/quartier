import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LocalMvpEditor from '@/components/mvp/LocalMvpEditor.vue'
import {
  DEFAULT_DOCUMENT,
  DEFAULT_DOCUMENT_TITLE,
  LEGACY_LOCAL_DOCUMENT_KEY,
  LOCAL_DOCUMENTS_KEY,
  addImportedDocument,
  createDocument,
  createDocumentExport,
  deleteDocument,
  duplicateDocument,
  getActiveDocument,
  importDocumentFile,
  loadDocumentCollection,
  renameDocument,
  sanitizeFilename,
  saveDocumentSource,
  switchDocument,
} from '@/services/localDocument'

describe('local document persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('creates and persists a starter collection', () => {
    const collection = loadDocumentCollection()

    expect(collection.version).toBe(2)
    expect(collection.documents).toHaveLength(1)
    expect(getActiveDocument(collection)).toMatchObject({
      title: DEFAULT_DOCUMENT_TITLE,
      source: DEFAULT_DOCUMENT,
    })
    expect(localStorage.getItem(LOCAL_DOCUMENTS_KEY)).not.toBeNull()
  })

  it('migrates the Milestone 1 document and removes the legacy key', () => {
    localStorage.setItem(LEGACY_LOCAL_DOCUMENT_KEY, '# Migrated local draft')

    const collection = loadDocumentCollection()

    expect(getActiveDocument(collection).source).toBe('# Migrated local draft')
    expect(localStorage.getItem(LEGACY_LOCAL_DOCUMENT_KEY)).toBeNull()
    expect(JSON.parse(localStorage.getItem(LOCAL_DOCUMENTS_KEY) ?? '{}')).toMatchObject({
      version: 2,
      activeDocumentId: collection.activeDocumentId,
    })
  })

  it('creates, edits, and switches between documents', () => {
    const first = getActiveDocument(loadDocumentCollection())
    const afterCreate = createDocument()
    const second = getActiveDocument(afterCreate)

    expect(second.id).not.toBe(first.id)
    expect(afterCreate.documents).toHaveLength(2)

    saveDocumentSource(second.id, '# Second document')
    const switched = switchDocument(first.id)

    expect(getActiveDocument(switched).id).toBe(first.id)
    expect(switched.documents.find(document => document.id === second.id)?.source)
      .toBe('# Second document')
  })

  it('renames, duplicates, and deletes documents', () => {
    const original = getActiveDocument(loadDocumentCollection())
    saveDocumentSource(original.id, '# Original content')

    const renamed = renameDocument(original.id, 'Research Notes')
    expect(getActiveDocument(renamed).title).toBe('Research Notes')

    const duplicated = duplicateDocument(original.id)
    const copy = getActiveDocument(duplicated)
    expect(copy).toMatchObject({
      title: 'Research Notes Copy',
      source: '# Original content',
    })

    const afterDelete = deleteDocument(copy.id)
    expect(afterDelete.documents).toHaveLength(1)
    expect(getActiveDocument(afterDelete).title).toBe('Research Notes')
  })

  it('replaces the final deleted document with a new starter document', () => {
    const original = getActiveDocument(loadDocumentCollection())
    const collection = deleteDocument(original.id)

    expect(collection.documents).toHaveLength(1)
    expect(getActiveDocument(collection)).toMatchObject({
      title: DEFAULT_DOCUMENT_TITLE,
      source: DEFAULT_DOCUMENT,
    })
    expect(getActiveDocument(collection).id).not.toBe(original.id)
  })

  it('adds an imported document and makes it active', () => {
    const collection = addImportedDocument({
      title: 'Imported notes',
      source: '# From disk',
    })

    expect(collection.documents).toHaveLength(2)
    expect(getActiveDocument(collection)).toMatchObject({
      title: 'Imported notes',
      source: '# From disk',
    })
  })
})

describe('local document import and export helpers', () => {
  it('prepares supported local files for import', async () => {
    const imported = await importDocumentFile({
      name: 'Field Notes.Markdown',
      text: async () => '# Imported',
    })

    expect(imported).toEqual({
      title: 'Field Notes',
      source: '# Imported',
    })
  })

  it('rejects unsupported file extensions', async () => {
    await expect(importDocumentFile({
      name: 'notes.pdf',
      text: async () => 'not markdown',
    })).rejects.toThrow('Choose a .qmd, .md, .markdown, or .txt file.')
  })

  it.each([
    ['My Research Notes', 'my-research-notes'],
    ['  Café / Results: 2026  ', 'cafe-results-2026'],
    ['../../', 'quartier-document'],
    ['A'.repeat(100), 'a'.repeat(80)],
  ])('sanitizes %j for a download filename', (title, expected) => {
    expect(sanitizeFilename(title)).toBe(expected)
  })

  it('creates an export using the sanitized document title', () => {
    const exported = createDocumentExport({
      title: 'Quarterly Results / Draft',
      source: '# Export me',
    })

    expect(exported.filename).toBe('quarterly-results-draft.qmd')
    expect(exported.blob.type).toBe('text/markdown;charset=utf-8')
    expect(exported.blob.size).toBe(new Blob(['# Export me']).size)
  })
})

describe('LocalMvpEditor', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('creates, edits, and switches local documents', async () => {
    const wrapper = mount(LocalMvpEditor)
    const firstId = loadDocumentCollection().activeDocumentId

    await wrapper.get('[data-testid="create-document"]').trigger('click')
    await wrapper.get('[data-testid="source-editor"]').setValue('# Second draft')

    expect(loadDocumentCollection().documents).toHaveLength(2)
    expect(getActiveDocument(loadDocumentCollection()).source).toBe('# Second draft')

    await wrapper.get(`[data-document-id="${firstId}"]`).trigger('click')

    expect((wrapper.get('[data-testid="source-editor"]').element as HTMLTextAreaElement).value)
      .toBe(DEFAULT_DOCUMENT)
  })

  it('renames, duplicates, and deletes the active document', async () => {
    const wrapper = mount(LocalMvpEditor)
    const titleInput = wrapper.get('[data-testid="document-title"]')

    await titleInput.setValue('Project Alpha')
    await titleInput.trigger('change')
    expect(getActiveDocument(loadDocumentCollection()).title).toBe('Project Alpha')

    await wrapper.get('[data-testid="duplicate-document"]').trigger('click')
    expect(loadDocumentCollection().documents).toHaveLength(2)
    expect(getActiveDocument(loadDocumentCollection()).title).toBe('Project Alpha Copy')

    await wrapper.get('[data-testid="delete-document"]').trigger('click')
    expect(loadDocumentCollection().documents).toHaveLength(1)
    expect(getActiveDocument(loadDocumentCollection()).title).toBe('Project Alpha')
  })

  it('resets the active document content', async () => {
    const wrapper = mount(LocalMvpEditor)

    await wrapper.get('[data-testid="source-editor"]').setValue('# Existing draft')
    await wrapper.get('[data-testid="reset-document"]').trigger('click')

    expect((wrapper.get('[data-testid="source-editor"]').element as HTMLTextAreaElement).value)
      .toBe(DEFAULT_DOCUMENT)
    expect(getActiveDocument(loadDocumentCollection()).source).toBe(DEFAULT_DOCUMENT)
  })

  it('downloads the current source using the sanitized title', async () => {
    const createObjectURL = vi.fn(() => 'blob:quartier-export')
    const revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const originalCreateElement = document.createElement.bind(document)
    let downloadName = ''
    const createElement = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const element = originalCreateElement(tagName)
      if (tagName.toLowerCase() === 'a') {
        Object.defineProperty(element, 'download', {
          get: () => downloadName,
          set: value => { downloadName = value },
          configurable: true,
        })
      }
      return element
    })
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    const wrapper = mount(LocalMvpEditor)
    const titleInput = wrapper.get('[data-testid="document-title"]')
    await titleInput.setValue('My Export / Notes')
    await titleInput.trigger('change')
    await wrapper.get('[data-testid="source-editor"]').setValue('# Download me')
    await wrapper.get('[data-testid="export-document"]').trigger('click')

    expect(downloadName).toBe('my-export-notes.qmd')
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:quartier-export')

    vi.unstubAllGlobals()
    createElement.mockRestore()
    click.mockRestore()
  })
})
