import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SetupContext } from 'vue'
import OfflineQuartoWriter from '@/components/writer/OfflineQuartoWriter.vue'

type EditorWrapperMockProps = {
  initialContent: string
  filename?: string
}

let editorInsertAvailable = true

vi.mock('@/components/editor/EditorWrapper.vue', () => ({
  default: {
    name: 'EditorWrapper',
    props: ['initialContent', 'mode', 'filename'],
    emits: ['update:content'],
    setup(props: EditorWrapperMockProps, { emit, expose }: SetupContext<('update:content')[]>) {
      expose({
        insertCallout: () => {
          if (!editorInsertAvailable) return false
          emit('update:content', `${props.initialContent}\n\n::: {.callout-note title="Note"}\n\n:::\n`)
          return true
        },
        insertFencedDiv: (kind: 'tabset' | 'columns' | 'generic') => {
          if (!editorInsertAvailable) return false
          const source = kind === 'tabset'
            ? '::: {.panel-tabset}\n\n## Tab 1\n\n\n## Tab 2\n\n\n:::'
            : kind === 'columns'
              ? '::: {.columns}\n\n::: {.column width="50%"}\n\n\n:::\n\n::: {.column width="50%"}\n\n\n:::\n\n:::'
              : '::: {.custom}\n\n:::'
          emit('update:content', `${props.initialContent}\n\n${source}\n`)
          return true
        },
      })
      return { props }
    },
    template: `
      <section data-test="editor">
        <p data-test="filename">{{ props.filename }}</p>
        <textarea
          data-test="editor-input"
          :value="props.initialContent"
          @input="$emit('update:content', $event.target.value)"
        />
      </section>
    `,
  },
}))

describe('OfflineQuartoWriter', () => {
  beforeEach(() => {
    window.localStorage.clear()
    editorInsertAvailable = true
  })

  it('starts as a calm single-document Quarto writer with import and blank document actions', () => {
    const wrapper = mount(OfflineQuartoWriter)

    expect(wrapper.text()).toContain('Quarto finally flows')
    expect(wrapper.text()).toContain('Open a .qmd')
    expect(wrapper.text()).toContain('New Quarto document')
    expect(wrapper.find('[data-test="writer-start"]').exists()).toBe(true)
  })

  it('opens a blank document with minimal chrome and export affordance', async () => {
    const wrapper = mount(OfflineQuartoWriter)

    await wrapper.find('[data-test="new-document"]').trigger('click')

    expect(wrapper.find('[data-test="writer-start"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="writer-shell"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="document-title"]').text()).toBe('Untitled.qmd')
    expect(wrapper.find('[data-test="save-state"]').text()).toContain('Autosaved')
    expect(wrapper.find('[data-test="export-document"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Autocomplete-first Quarto writer')
    expect(wrapper.find('[data-test="document-stats"]').text()).toContain('words')
  })

  it('renders a safe local preview and source diagnostics', async () => {
    const wrapper = mount(OfflineQuartoWriter)

    await wrapper.find('[data-test="new-document"]').trigger('click')
    await wrapper.find('[data-test="editor-input"]').setValue('# Safe heading\n\n<script>alert(1)</script>')
    await wrapper.find('[data-test="preview-toggle"]').trigger('click')

    expect(wrapper.find('[data-test="rendered-preview"]').html()).toContain('<h1>Safe heading</h1>')
    expect(wrapper.find('[data-test="rendered-preview"]').html()).toContain('&lt;script&gt;')
    expect(wrapper.find('[data-test="rendered-preview"]').html()).not.toContain('<script>')

    await wrapper.find('[data-test="editor-input"]').setValue('---\ntitle: Broken')

    expect(wrapper.find('[data-test="source-diagnostics"]').text()).toContain('no closing')
  })

  it('inserts a canonical note callout from the writer chrome', async () => {
    const wrapper = mount(OfflineQuartoWriter)

    await wrapper.find('[data-test="new-document"]').trigger('click')
    await wrapper.find('[data-test="insert-callout"]').trigger('click')

    const saved = JSON.parse(window.localStorage.getItem('quartier:offline-writer-document') || '{}') as { content?: string }
    expect(saved.content).toContain('::: {.callout-note title="Note"}')
  })

  it('falls back to appending a canonical note callout when editor insertion is unavailable', async () => {
    editorInsertAvailable = false
    const wrapper = mount(OfflineQuartoWriter)

    await wrapper.find('[data-test="new-document"]').trigger('click')
    await wrapper.find('[data-test="insert-callout"]').trigger('click')

    const saved = JSON.parse(window.localStorage.getItem('quartier:offline-writer-document') || '{}') as { content?: string }
    expect(saved.content).toContain('::: {.callout-note title="Note"}')
    expect(saved.content?.match(/\.callout-note/g)).toHaveLength(1)
  })

  it('inserts tabsets and columns from the writer chrome', async () => {
    const wrapper = mount(OfflineQuartoWriter)

    await wrapper.find('[data-test="new-document"]').trigger('click')
    await wrapper.find('[data-test="insert-tabset"]').trigger('click')
    await wrapper.find('[data-test="insert-columns"]').trigger('click')

    const saved = JSON.parse(window.localStorage.getItem('quartier:offline-writer-document') || '{}') as { content?: string }
    expect(saved.content).toContain('::: {.panel-tabset}')
    expect(saved.content).toContain('::: {.columns}')
  })
})
