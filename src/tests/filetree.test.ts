import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import FileTree from '@/components/file-browser/FileTree.vue'
import type { FileItem } from '@/types/files'

// Helper to create FileItem from path
function toFileItems(paths: string[]): FileItem[] {
    return paths.map(path => ({ path, type: 'file' as const }))
}

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
                files: toFileItems(['file1.txt', 'file2.md', 'folder/file3.ts']),
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
                files: toFileItems(['test.txt']),
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
                        emits: ['select', 'context-menu', 'enter-folder'],
                    },
                }
            }
        })

        await wrapper.find('.node-stub').trigger('click')

        expect(wrapper.emitted('select')).toBeTruthy()
        expect(wrapper.emitted('select')?.[0]).toEqual(['test.txt'])
    })
})

// Direct tests for buildFileTree childrenLoaded logic
import { buildFileTree } from '@/types/files'

describe('buildFileTree childrenLoaded', () => {
    it('marks folders with children as loaded', () => {
        const items: FileItem[] = [
            { path: 'folder/file.txt', type: 'file' },
        ]
        
        const tree = buildFileTree(items)
        
        // The 'folder' node should be marked as loaded because it has a child
        expect(tree[0]?.name).toBe('folder')
        expect(tree[0]?.childrenLoaded).toBe(true)
    })

    it('marks empty folders (dir type) as not loaded', () => {
        const items: FileItem[] = [
            { path: 'emptyFolder', type: 'dir' },
        ]
        
        const tree = buildFileTree(items)
        
        // An empty folder returned by API should be marked as not loaded
        // (because we haven't fetched its contents yet - it might have files)
        expect(tree[0]?.name).toBe('emptyFolder')
        expect(tree[0]?.childrenLoaded).toBe(false)
    })

    it('marks nested parent folders as loaded', () => {
        const items: FileItem[] = [
            { path: 'a/b/c/file.txt', type: 'file' },
        ]
        
        const tree = buildFileTree(items)
        
        // All ancestor folders should be marked as loaded
        expect(tree[0]?.name).toBe('a')
        expect(tree[0]?.childrenLoaded).toBe(true)
        expect(tree[0]?.children?.[0]?.name).toBe('b')
        expect(tree[0]?.children?.[0]?.childrenLoaded).toBe(true)
        expect(tree[0]?.children?.[0]?.children?.[0]?.name).toBe('c')
        expect(tree[0]?.children?.[0]?.children?.[0]?.childrenLoaded).toBe(true)
    })
})
