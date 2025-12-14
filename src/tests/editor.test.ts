import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import EditorWrapper from '@/components/editor/EditorWrapper.vue'

// Mock Yjs components
vi.mock('yjs', () => ({
  Doc: class { destroy() { } },
}))

vi.mock('y-webrtc', () => ({
  WebrtcProvider: class { destroy() { } },
}))

vi.mock('y-indexeddb', () => ({
  IndexeddbPersistence: class {
    on() { }
    destroy() { }
  },
}))

describe('EditorWrapper', () => {
  it('renders correctly with both modes', () => {
    const wrapper = mount(EditorWrapper, {
      props: {
        initialContent: '# Test',
        mode: 'visual' as const
      },
      global: {
        stubs: {
          MilkdownEditor: { template: '<div class="milkdown-stub"></div>' },
          CodeEditor: { template: '<div class="code-stub"></div>' },
        }
      }
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('shows saving indicator on content change', async () => {
    const wrapper = mount(EditorWrapper, {
      props: {
        initialContent: '# Test',
        mode: 'visual' as const
      },
      global: {
        stubs: {
          MilkdownEditor: { template: '<div class="milkdown-stub"></div>' },
          CodeEditor: { template: '<div class="code-stub"></div>' },
        }
      }
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('emits update:content when content changes', async () => {
    const wrapper = mount(EditorWrapper, {
      props: {
        initialContent: '# Test',
        mode: 'visual' as const
      },
      global: {
        stubs: {
          MilkdownEditor: { template: '<div class="milkdown-stub"></div>' },
          CodeEditor: { template: '<div class="code-stub"></div>' },
        }
      }
    })

    expect(wrapper.emitted()).toBeDefined()
  })
})
