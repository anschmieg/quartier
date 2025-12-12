<template>
  <div>
    <!-- Current node -->
    <div 
      class="flex items-center gap-1 py-1 px-2 text-sm rounded cursor-pointer hover:bg-muted group"
      :class="{ 'bg-muted': selectedPath === node.path }"
      :style="{ paddingLeft: `${level * 12 + 8}px` }"
      @click="handleClick"
      @dblclick="handleDoubleClick"
      @contextmenu.prevent="handleContextMenu"
    >
      <!-- Expand/collapse chevron for folders -->
      <button
        v-if="node.type === 'folder'"
        class="w-4 h-4 flex items-center justify-center -ml-1"
        @click.stop="isExpanded = !isExpanded"
      >
        <ChevronRight 
          class="w-3 h-3 transition-transform" 
          :class="{ 'rotate-90': isExpanded }"
        />
      </button>
      <div v-else class="w-4" />

      <!-- File/folder icon -->
      <FileIcon 
        :name="node.name" 
        :type="node.type"
        :is-open="isExpanded"
        monochrome
      />

      <!-- Name -->
      <span class="truncate flex-1">{{ node.name }}</span>
    </div>

    <!-- Children (recursive) -->
    <template v-if="node.type === 'folder' && isExpanded && node.children">
      <FileTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :selected-path="selectedPath"
        :level="level + 1"
        @select="emit('select', $event)"
        @enter-folder="emit('enter-folder', $event)"
        @context-menu="emit('context-menu', $event)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import FileIcon from './FileIcon.vue'
import type { FileNode } from '@/types/files'

const props = defineProps<{
  node: FileNode
  selectedPath?: string | null
  level: number
}>()

const emit = defineEmits<{
  select: [path: string]
  'enter-folder': [path: string]
  'context-menu': [event: { node: FileNode; x: number; y: number }]
}>()

const isExpanded = ref(false)

function handleClick() {
  if (props.node.type === 'file') {
    emit('select', props.node.path)
  } else {
    isExpanded.value = !isExpanded.value
  }
}

function handleDoubleClick() {
  if (props.node.type === 'folder') {
    emit('enter-folder', props.node.path)
  }
}

function handleContextMenu(event: MouseEvent) {
  emit('context-menu', {
    node: props.node,
    x: event.clientX,
    y: event.clientY,
  })
}
</script>
