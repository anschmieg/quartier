import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LocalMvpEditor from '@/components/mvp/LocalMvpEditor.vue'
import {
  DEFAULT_DOCUMENT,
  LOCAL_DOCUMENT_KEY,
  createDocumentExport,
  loadDocument,
  resetDocument,
  saveDocument,
} from '@/services/localDocument'

describe('local document persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads the starter document when no draft exists', () => {
    expect(loadDocument()).toBe(DEFAULT_DOCUMENT)
  })

  it('persists and reloads source content', () => {
    const source = '# Local draft\n\nSaved in this browser.'

    saveDocument(source)

    expect(localStorage.getItem(LOCAL_DOCUMENT_KEY)).toBe(source)
    expect(loadDocument()).toBe(source)
  })

  it('resets the persisted draft to the starter document', () => {
    saveDocument('# Replace me')

    expect(resetDocument()).toBe(DEFAULT_DOCUMENT)
    expect(loadDocument()).toBe(DEFAULT_DOCUMENT)
  })

  it('creates an export-ready Quarto file', () => {
    const source = '---\ntitle: "Export"\n---\n'
    const exported = createDocumentExport(source)

    expect(exported.filename).toBe('quartier-document.qmd')
    expect(exported.blob.type).toBe('text/markdown;charset=utf-8')
    expect(exported.blob.size).toBe(new Blob([source]).size)
  })
})

describe('LocalMvpEditor', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('restores and persists edits', async () => {
    saveDocument('# Existing draft')
    const wrapper = mount(LocalMvpEditor)
    const editor = wrapper.get('[data-testid="source-editor"]')

    expect((editor.element as HTMLTextAreaElement).value).toBe('# Existing draft')

    await editor.setValue('# Updated draft')

    expect(localStorage.getItem(LOCAL_DOCUMENT_KEY)).toBe('# Updated draft')
  })

  it('resets the editor and persisted content', async () => {
    saveDocument('# Existing draft')
    const wrapper = mount(LocalMvpEditor)

    await wrapper.get('[data-testid="reset-document"]').trigger('click')

    expect((wrapper.get('[data-testid="source-editor"]').element as HTMLTextAreaElement).value)
      .toBe(DEFAULT_DOCUMENT)
    expect(loadDocument()).toBe(DEFAULT_DOCUMENT)
  })

  it('downloads the current source as a Quarto file', async () => {
    const createObjectURL = vi.fn(() => 'blob:quartier-export')
    const revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    const wrapper = mount(LocalMvpEditor)
    await wrapper.get('[data-testid="source-editor"]').setValue('# Download me')
    await wrapper.get('[data-testid="export-document"]').trigger('click')

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:quartier-export')

    vi.unstubAllGlobals()
    click.mockRestore()
  })
})
