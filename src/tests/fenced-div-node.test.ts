import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import FencedDivNode from '@/components/editor/plugins/fenced-div/FencedDivNode.vue'

const attrs = ref({
  class: 'panel-tabset custom',
  id: 'tabs',
  style: '',
  attributes: { 'data-owner': 'ada' },
})
const dispatch = vi.fn()
const setNodeAttribute = vi.fn(() => tr)
const tr = { setNodeAttribute }

vi.mock('@prosemirror-adapter/vue', () => ({
  useNodeViewContext: () => ({
    node: { value: { attrs: attrs.value } },
    contentRef: ref(null),
    view: { state: { tr }, dispatch },
    getPos: () => 9,
  }),
}))

describe('FencedDivNode', () => {
  it('renders a semantic tabset rest state with source preview', () => {
    const wrapper = mount(FencedDivNode)

    expect(wrapper.text()).toContain('Tabset')
    expect(wrapper.text()).toContain('Quarto container')
    expect(wrapper.text()).toContain('::: {#tabs .panel-tabset .custom data-owner="ada"}')
  })

  it('dispatches class edits from focused controls', async () => {
    const wrapper = mount(FencedDivNode)

    await wrapper.get('[data-test="fenced-div-class-input"]').setValue('columns gap')

    expect(setNodeAttribute).toHaveBeenCalledWith(9, 'class', 'columns gap')
    expect(dispatch).toHaveBeenCalledWith(tr)
  })
})
