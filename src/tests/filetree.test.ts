import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import FileTree from '@/components/file-tree/FileTree.vue'

// Mock child components
vi.mock('@/components/file-tree/FileTreeNode.vue', () => ({
    default: {
        template: '<div class="tree-node" @click="$emit(\'select\', node.path)"><slot /></div>',
        props: ['node', 'selectedPath', 'level'],
    }
}))

describe('FileTree', () => {
    it('renders empty tree for empty file list', () => {
        const wrapper = mount(FileTree, {
            props: {
                files: [],
                selectedPath: null
            },
            global: {
                stubs: {
                    ContextMenu: { template: '<div><slot /></div>' },
                    ContextMenuContent: { template: '<div><slot /></div>' },
                    ContextMenuItem: { template: '<div @click="$emit(\'select\')"><slot /></div>' },
                    ContextMenuSeparator: { template: '<hr />' },
                    ContextMenuTrigger: { template: '<div><slot /></div>' },
                    FileTreeNode: { template: '<div class="node-stub"></div>' },
                }
            }
        })

        expect(wrapper.find('.file-tree').exists()).toBe(true)
    })

    it('renders nodes for each root-level item', () => {
        const wrapper = mount(FileTree, {
            props: {
                files: ['file1.txt', 'file2.md', 'folder/file3.ts'],
                selectedPath: null
            },
            global: {
                stubs: {
                    ContextMenu: { template: '<div><slot /></div>' },
                    ContextMenuContent: { template: '<div><slot /></div>' },
                    ContextMenuItem: { template: '<div @click="$emit(\'select\')"><slot /></div>' },
                    ContextMenuSeparator: { template: '<hr />' },
                    ContextMenuTrigger: { template: '<div><slot /></div>' },
                    FileTreeNode: {
                        template: '<div class="node-stub" :data-path="node.path"></div>',
                        props: ['node', 'selectedPath', 'level'],
                    },
                }
            }
        })

        // Should render root items (file1.txt, file2.md, folder)
        const nodes = wrapper.findAll('.node-stub')
        expect(nodes).toHaveLength(3)
    })

    it('emits select event when file is clicked', async () => {
        const wrapper = mount(FileTree, {
            props: {
                files: ['test.txt'],
                selectedPath: null
            },
            global: {
                stubs: {
                    ContextMenu: { template: '<div><slot /></div>' },
                    ContextMenuContent: { template: '<div><slot /></div>' },
                    ContextMenuItem: { template: '<div @click="$emit(\'select\')"><slot /></div>' },
                    ContextMenuSeparator: { template: '<hr />' },
                    ContextMenuTrigger: { template: '<div><slot /></div>' },
                    FileTreeNode: {
                        template: '<div class="node-stub" @click="$emit(\'select\', \'test.txt\')"></div>',
                        props: ['node', 'selectedPath', 'level'],
                        emits: ['select', 'context-menu'],
                    },
                }
            }
        })

        await wrapper.find('.node-stub').trigger('click')

        expect(wrapper.emitted('select')).toBeTruthy()
        expect(wrapper.emitted('select')?.[0]).toEqual(['test.txt'])
    })
})
