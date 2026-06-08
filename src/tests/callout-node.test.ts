import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import CalloutNode from '@/components/editor/plugins/callout/CalloutNode.vue'

const attrs = ref({
  type: 'note',
  title: 'Careful note',
  collapse: '',
  appearance: 'default',
  icon: 'true',
  id: '',
})
const dispatch = vi.fn()
const setNodeAttribute = vi.fn(() => tr)
const tr = { setNodeAttribute }

vi.mock('@prosemirror-adapter/vue', () => ({
  useNodeViewContext: () => ({
    node: {
      value: {
        attrs: attrs.value,
        content: { firstChild: null },
      },
    },
    contentRef: ref(null),
    view: {
      state: { tr },
      dispatch,
    },
    getPos: () => 7,
  }),
}))

describe('CalloutNode', () => {
  it('renders a calm semantic rest state with source-trust affordance', () => {
    const wrapper = mount(CalloutNode, {
      global: {
        stubs: {
          DropdownMenu: { template: '<div><slot /></div>' },
          DropdownMenuTrigger: { template: '<div><slot /></div>' },
          DropdownMenuContent: { template: '<div><slot /></div>' },
          DropdownMenuLabel: { template: '<div><slot /></div>' },
          DropdownMenuSeparator: { template: '<hr />' },
          DropdownMenuCheckboxItem: { template: '<button><slot /></button>' },
          DropdownMenuRadioGroup: { template: '<div><slot /></div>' },
          DropdownMenuRadioItem: { template: '<button><slot /></button>' },
          Button: { template: '<button><slot /></button>' },
          Input: { template: '<input />' },
        },
      },
    })

    expect(wrapper.text()).toContain('Note')
    expect(wrapper.text()).toContain('Quarto callout')
    expect(wrapper.text()).toContain('::: {.callout-note')
  })

  it('dispatches stable option edits from focused controls', async () => {
    const wrapper = mount(CalloutNode, {
      global: {
        stubs: {
          DropdownMenu: { template: '<div><slot /></div>' },
          DropdownMenuTrigger: { template: '<div><slot /></div>' },
          DropdownMenuContent: { template: '<div><slot /></div>' },
          DropdownMenuLabel: { template: '<div><slot /></div>' },
          DropdownMenuSeparator: { template: '<hr />' },
          DropdownMenuCheckboxItem: { template: '<button><slot /></button>' },
          DropdownMenuRadioGroup: { template: '<div><slot /></div>' },
          DropdownMenuRadioItem: { template: '<button><slot /></button>' },
          Button: { template: '<button><slot /></button>' },
          Input: { template: '<input />' },
        },
      },
    })

    await wrapper.get('[data-test="callout-title-input"]').setValue('Updated note')

    expect(setNodeAttribute).toHaveBeenCalledWith(7, 'title', 'Updated note')
    expect(dispatch).toHaveBeenCalledWith(tr)
  })
})
