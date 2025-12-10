import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EditorWrapper from '@/components/editor/EditorWrapper.vue'

// Basic sanity check since we can't easily test Tiptap/Canvas in this environment without heavy setup
describe('EditorWrapper', () => {
  it('renders correctly', () => {
    const wrapper = mount(EditorWrapper, {
      props: {
        initialContent: 'Hello World'
      },
      global: {
        stubs: {
          TiptapEditor: { template: '<div class="tiptap-stub"></div>' },
          CodeEditor: { template: '<div class="code-stub"></div>' }
        }
      }
    })
    
    expect(wrapper.exists()).toBe(true)
    // Default mode is visual
    expect(wrapper.find('.tiptap-stub').isVisible()).toBe(true)
  })
})
