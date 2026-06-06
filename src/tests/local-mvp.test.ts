import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LocalMvpEditor from '@/components/mvp/LocalMvpEditor.vue'
import {
  DEFAULT_DOCUMENT,
  DEFAULT_DOCUMENT_TITLE,
  LEGACY_LOCAL_DOCUMENT_KEY,
  LOCAL_DOCUMENTS_KEY,
  addImportedDocument,
  createLibraryBackup,
  createLibraryBackupExport,
  createDocument,
  createDocumentExport,
  deleteDocument,
  duplicateDocument,
  getActiveDocument,
  importDocumentFile,
  loadDocumentCollection,
  renameDocument,
  restoreLibraryBackupFile,
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
  beforeEach(() => {
    localStorage.clear()
  })

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

  it('creates a versioned backup containing the complete local library', () => {
    const first = getActiveDocument(loadDocumentCollection())
    renameDocument(first.id, 'First draft')
    saveDocumentSource(first.id, '# First')
    const collection = createDocument()
    const second = getActiveDocument(collection)
    renameDocument(second.id, 'Second draft')
    saveDocumentSource(second.id, '# Second')

    const backup = createLibraryBackup(loadDocumentCollection())

    expect(backup).toMatchObject({
      format: 'quartier-local-library',
      version: 1,
      activeDocumentId: second.id,
    })
    expect(backup.exportedAt).toEqual(expect.any(String))
    expect(backup.documents).toHaveLength(2)
    expect(backup.documents.map(document => ({
      id: document.id,
      title: document.title,
      source: document.source,
    }))).toEqual([
      { id: first.id, title: 'First draft', source: '# First' },
      { id: second.id, title: 'Second draft', source: '# Second' },
    ])

    const exported = createLibraryBackupExport(loadDocumentCollection())
    expect(exported.filename).toMatch(/^quartier-library-backup-\d{4}-\d{2}-\d{2}\.json$/)
    expect(exported.blob.type).toBe('application/json;charset=utf-8')
  })

  it('validates and restores a complete library backup', async () => {
    const existing = getActiveDocument(loadDocumentCollection())
    const backup = {
      format: 'quartier-local-library',
      version: 1,
      exportedAt: '2026-06-06T12:00:00.000Z',
      activeDocumentId: 'restored-2',
      documents: [
        {
          id: 'restored-1',
          title: 'Restored one',
          source: '# One',
          createdAt: '2026-06-01T12:00:00.000Z',
          updatedAt: '2026-06-02T12:00:00.000Z',
        },
        {
          id: 'restored-2',
          title: 'Restored two',
          source: '# Two',
          createdAt: '2026-06-03T12:00:00.000Z',
          updatedAt: '2026-06-04T12:00:00.000Z',
        },
      ],
    }

    const restored = await restoreLibraryBackupFile({
      name: 'quartier-backup.json',
      text: async () => JSON.stringify(backup),
    })

    expect(restored).toMatchObject({
      version: 2,
      activeDocumentId: 'restored-2',
    })
    expect(restored.documents).toHaveLength(2)
    expect(getActiveDocument(restored).title).toBe('Restored two')
    expect(restored.documents.some(document => document.id === existing.id)).toBe(false)
    expect(loadDocumentCollection()).toEqual(restored)
  })

  it.each([
    ['not-json', 'This file is not valid JSON.'],
    [JSON.stringify({ format: 'quartier-local-library', version: 99 }), 'This backup version is not supported.'],
    [JSON.stringify({
      format: 'quartier-local-library',
      version: 1,
      exportedAt: '2026-06-06T12:00:00.000Z',
      activeDocumentId: 'missing',
      documents: [],
    }), 'This backup does not contain a valid Quartier document library.'],
  ])('rejects invalid restore content without replacing local documents', async (content, message) => {
    const before = loadDocumentCollection()

    await expect(restoreLibraryBackupFile({
      name: 'quartier-backup.json',
      text: async () => content,
    })).rejects.toThrow(message)

    expect(loadDocumentCollection()).toEqual(before)
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

  it('filters local documents by title and source without changing the active document', async () => {
    const wrapper = mount(LocalMvpEditor)
    const firstId = loadDocumentCollection().activeDocumentId
    const titleInput = wrapper.get('[data-testid="document-title"]')
    const sourceInput = wrapper.get('[data-testid="source-editor"]')

    await titleInput.setValue('Alpha outline')
    await titleInput.trigger('change')
    await sourceInput.setValue('# Alpha\nLocal planning notes')
    await wrapper.get('[data-testid="create-document"]').trigger('click')
    await wrapper.get('[data-testid="document-title"]').setValue('Beta draft')
    await wrapper.get('[data-testid="document-title"]').trigger('change')
    await wrapper.get('[data-testid="source-editor"]').setValue('# Beta\nContains pineapple keyword')

    expect(getActiveDocument(loadDocumentCollection()).title).toBe('Beta draft')

    await wrapper.get('[data-testid="document-search"]').setValue('alpha')

    expect(wrapper.findAll('.document-item')).toHaveLength(1)
    expect(wrapper.get('.document-item').text()).toContain('Alpha outline')
    expect((wrapper.get('[data-testid="source-editor"]').element as HTMLTextAreaElement).value)
      .toContain('pineapple keyword')
    expect(getActiveDocument(loadDocumentCollection()).title).toBe('Beta draft')

    await wrapper.get('[data-testid="document-search"]').setValue('pineapple')

    expect(wrapper.findAll('.document-item')).toHaveLength(1)
    expect(wrapper.get('.document-item').text()).toContain('Beta draft')

    await wrapper.get('[data-testid="clear-document-search"]').trigger('click')
    await wrapper.get(`[data-document-id="${firstId}"]`).trigger('click')
    expect(getActiveDocument(loadDocumentCollection()).title).toBe('Alpha outline')
  })

  it('shows an empty search state and clears the document filter', async () => {
    const wrapper = mount(LocalMvpEditor)

    await wrapper.get('[data-testid="create-document"]').trigger('click')
    expect(wrapper.findAll('.document-item')).toHaveLength(2)

    await wrapper.get('[data-testid="document-search"]').setValue('no matching local document')

    expect(wrapper.findAll('.document-item')).toHaveLength(0)
    expect(wrapper.get('[data-testid="document-search-empty"]').text())
      .toContain('no matching local document')

    await wrapper.get('[data-testid="clear-document-search"]').trigger('click')

    expect((wrapper.get('[data-testid="document-search"]').element as HTMLInputElement).value)
      .toBe('')
    expect(wrapper.findAll('.document-item')).toHaveLength(2)
    expect(wrapper.find('[data-testid="document-search-empty"]').exists()).toBe(false)
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

  it('toggles between source, split, and preview views', async () => {
    const wrapper = mount(LocalMvpEditor)

    expect(wrapper.find('[data-testid="source-editor"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="preview-panel"]').exists()).toBe(true)

    await wrapper.get('[data-testid="source-view"]').trigger('click')
    expect(wrapper.find('[data-testid="source-editor"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="preview-panel"]').exists()).toBe(false)

    await wrapper.get('[data-testid="preview-view"]').trigger('click')
    expect(wrapper.find('[data-testid="source-editor"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="preview-panel"]').exists()).toBe(true)

    await wrapper.get('[data-testid="split-view"]').trigger('click')
    expect(wrapper.find('[data-testid="source-editor"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="preview-panel"]').exists()).toBe(true)
  })

  it('keeps remote storage collapsed and network-inert until explicit opt-in', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const wrapper = mount(LocalMvpEditor)

    expect(wrapper.get('[data-testid="remote-storage-toggle"]').text())
      .toContain('Local editing works without connecting.')
    expect(wrapper.get('[data-testid="remote-storage-toggle"]').attributes('aria-expanded'))
      .toBe('false')
    expect(wrapper.find('[data-testid="remote-storage-panel"]').exists()).toBe(false)
    expect(fetch).not.toHaveBeenCalled()

    await wrapper.get('[data-testid="remote-storage-toggle"]').trigger('click')

    expect(wrapper.get('[data-testid="remote-storage-toggle"]').attributes('aria-expanded'))
      .toBe('true')
    expect(wrapper.get('[data-testid="remote-storage-panel"]').text())
      .toContain('live GitHub OAuth and sync are not enabled yet')
    expect(wrapper.get('[data-testid="remote-storage-panel"]').text())
      .toContain('disconnected')
    expect(fetch).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('reports the deferred GitHub scaffold only after connect is invoked', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const wrapper = mount(LocalMvpEditor)

    await wrapper.get('[data-testid="remote-storage-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="remote-storage-message"]').exists()).toBe(false)

    await wrapper.get('[data-testid="connect-github"]').trigger('click')

    expect(wrapper.get('[data-testid="remote-storage-message"]').text())
      .toContain('live OAuth and API access are deferred')
    expect(fetch).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
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

  it('restores a backup file and refreshes the active document', async () => {
    const wrapper = mount(LocalMvpEditor)
    const backup = {
      format: 'quartier-local-library',
      version: 1,
      exportedAt: '2026-06-06T12:00:00.000Z',
      activeDocumentId: 'restored-active',
      documents: [{
        id: 'restored-active',
        title: 'Recovered project',
        source: '# Recovered',
        createdAt: '2026-06-01T12:00:00.000Z',
        updatedAt: '2026-06-05T12:00:00.000Z',
      }],
    }
    const input = wrapper.get('[data-testid="backup-file-input"]')
    Object.defineProperty(input.element, 'files', {
      value: [{
        name: 'quartier-library-backup.json',
        text: async () => JSON.stringify(backup),
      }],
      configurable: true,
    })

    await input.trigger('change')

    expect((wrapper.get('[data-testid="document-title"]').element as HTMLInputElement).value)
      .toBe('Recovered project')
    expect((wrapper.get('[data-testid="source-editor"]').element as HTMLTextAreaElement).value)
      .toBe('# Recovered')
    expect(wrapper.get('[role="status"]').text()).toContain('Restored 1 document')
    expect(getActiveDocument(loadDocumentCollection()).id).toBe('restored-active')
  })

  it('shows a safe error when a backup cannot be restored', async () => {
    const wrapper = mount(LocalMvpEditor)
    const before = loadDocumentCollection()
    const input = wrapper.get('[data-testid="backup-file-input"]')
    Object.defineProperty(input.element, 'files', {
      value: [{
        name: 'broken.json',
        text: async () => '{broken',
      }],
      configurable: true,
    })

    await input.trigger('change')

    expect(wrapper.get('[role="status"]').text()).toBe('This file is not valid JSON.')
    expect(wrapper.get('[role="status"]').classes()).toContain('error')
    expect(loadDocumentCollection()).toEqual(before)
  })
})
