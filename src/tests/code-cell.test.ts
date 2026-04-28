import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import CodeCell from '@/components/editor/CodeCell.vue'

const textContent = ref('#| label: fig-example\n#| fig-cap: "Example figure"\n#| echo: false\n\nprint("hi")')
const attrs = ref({ language: '{python}' })
const selected = ref(false)
const dispatch = vi.fn()

vi.mock('@prosemirror-adapter/vue', () => ({
  useNodeViewContext: () => ({
    node: {
      value: {
        attrs: attrs.value,
        get textContent() {
          return textContent.value
        },
      },
    },
    contentRef: ref(null),
    selected,
    view: {
      state: {
        tr: {
          insertText: vi.fn((value) => ({ value })),
        },
      },
      dispatch,
      focus: vi.fn(),
    },
  }),
}))

describe('CodeCell', () => {
  it('renders a prepare-dont-run semantic rest state', () => {
    const wrapper = mount(CodeCell)

    expect(wrapper.text()).toContain('Python')
    expect(wrapper.text()).toContain('fig-example')
    expect(wrapper.text()).toContain('Example figure')
    expect(wrapper.text()).toContain('echo: false')
    expect(wrapper.text()).not.toContain('Run')
  })

  it('reveals source options controls and dispatches option edits', async () => {
    const wrapper = mount(CodeCell)

    await wrapper.get('[data-test="edit-cell-options"]').trigger('click')
    await wrapper.get('[data-test="cell-label-input"]').setValue('fig-updated')

    expect(dispatch).toHaveBeenCalled()
  })
})
