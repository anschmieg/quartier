import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import OfflineQuartoWriter from '@/components/writer/OfflineQuartoWriter.vue'

vi.mock('@/components/editor/EditorWrapper.vue', () => ({
  default: {
    name: 'EditorWrapper',
    props: ['initialContent', 'mode', 'filename'],
    emits: ['update:content'],
    template: `
      <section data-test="editor">
        <p data-test="filename">{{ filename }}</p>
        <textarea
          data-test="editor-input"
          :value="initialContent"
          @input="$emit('update:content', $event.target.value)"
        />
      </section>
    `,
  },
}))

describe('OfflineQuartoWriter', () => {
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
  })
})
