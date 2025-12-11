<template>
  <div class="file-tree">
    <FileTreeNode
      v-for="node in treeItems"
      :key="node.id"
      :node="node"
      :selected-path="selectedPath"
      :level="0"
      @select="emit('select', $event)"
      @context-menu="handleContextMenu"
    />

    <!-- Context Menu -->
    <ContextMenu v-model:open="contextMenuOpen">
      <ContextMenuTrigger as-child>
        <div ref="contextMenuAnchor" class="fixed" :style="contextMenuStyle" />
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem @select="handleNewFile">
          <FilePlus class="w-4 h-4 mr-2" />
          New File
        </ContextMenuItem>
        <ContextMenuItem @select="handleNewFolder">
          <FolderPlus class="w-4 h-4 mr-2" />
          New Folder
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem @select="handleRename">
          <Pencil class="w-4 h-4 mr-2" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem @select="handleDelete" class="text-destructive">
          <Trash2 class="w-4 h-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { FilePlus, FolderPlus, Pencil, Trash2 } from 'lucide-vue-next'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import FileTreeNode from './FileTreeNode.vue'
import { buildFileTree, type FileNode } from '@/types/files'

const props = defineProps<{
  files: string[]
  selectedPath?: string | null
}>()

const emit = defineEmits<{
  select: [path: string]
  'create-file': [parentPath: string]
  'create-folder': [parentPath: string]
  rename: [path: string]
  delete: [path: string]
}>()

// Convert flat file list to tree structure
const treeItems = computed(() => buildFileTree(props.files))

// Context menu state
const contextMenuOpen = ref(false)
const contextMenuTarget = ref<FileNode | null>(null)
const contextMenuPos = ref({ x: 0, y: 0 })

const contextMenuStyle = computed(() => ({
  left: `${contextMenuPos.value.x}px`,
  top: `${contextMenuPos.value.y}px`,
}))

function handleContextMenu(event: { node: FileNode; x: number; y: number }) {
  contextMenuTarget.value = event.node
  contextMenuPos.value = { x: event.x, y: event.y }
  contextMenuOpen.value = true
}

function handleNewFile() {
  if (contextMenuTarget.value) {
    const parentPath = contextMenuTarget.value.type === 'folder' 
      ? contextMenuTarget.value.path 
      : contextMenuTarget.value.path.split('/').slice(0, -1).join('/')
    emit('create-file', parentPath)
  }
}

function handleNewFolder() {
  if (contextMenuTarget.value) {
    const parentPath = contextMenuTarget.value.type === 'folder' 
      ? contextMenuTarget.value.path 
      : contextMenuTarget.value.path.split('/').slice(0, -1).join('/')
    emit('create-folder', parentPath)
  }
}

function handleRename() {
  if (contextMenuTarget.value) {
    emit('rename', contextMenuTarget.value.path)
  }
}

function handleDelete() {
  if (contextMenuTarget.value) {
    emit('delete', contextMenuTarget.value.path)
  }
}
</script>
