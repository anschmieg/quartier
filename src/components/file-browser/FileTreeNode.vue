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
        @click.stop="handleExpandClick"
      >
        <Loader2 
          v-if="loading"
          class="w-3 h-3 animate-spin text-muted-foreground" 
        />
        <ChevronRight 
          v-else
          class="w-3 h-3 transition-transform duration-200" 
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

    <!-- Children container with transition -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out overflow-hidden"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-[1000px]"
      leave-active-class="transition-all duration-150 ease-in overflow-hidden"
      leave-from-class="opacity-100 max-h-[1000px]"
      leave-to-class="opacity-0 max-h-0"
    >
      <div v-if="node.type === 'folder' && isExpanded">
        <!-- Loading indicator -->
        <div 
          v-if="loading"
          class="flex items-center gap-2 text-xs text-muted-foreground py-1"
          :style="{ paddingLeft: `${(level + 1) * 12 + 8}px` }"
        >
          <Loader2 class="w-3 h-3 animate-spin" />
          Loading...
        </div>
        
        <!-- Children -->
        <template v-else-if="node.children && node.children.length > 0">
          <FileTreeNode
            v-for="child in node.children"
            :key="child.id"
            :node="child"
            :selected-path="selectedPath"
            :level="level + 1"
            @select="emit('select', $event)"
            @enter-folder="emit('enter-folder', $event)"
            @expand-folder="emit('expand-folder', $event)"
            @context-menu="emit('context-menu', $event)"
          />
        </template>
        
        <!-- Empty folder (only show after loading completes) -->
        <div 
          v-else
          class="text-xs text-muted-foreground/70 italic py-1"
          :style="{ paddingLeft: `${(level + 1) * 12 + 8}px` }"
        >
          Empty folder
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ChevronRight, Loader2 } from 'lucide-vue-next'
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
  'expand-folder': [path: string]
  'context-menu': [event: { node: FileNode; x: number; y: number }]
}>()

const isExpanded = ref(false)
const loading = ref(false)
let expandTimeout: ReturnType<typeof setTimeout> | null = null

// Watch for children being loaded
watch(() => props.node.children, (newChildren) => {
  if (newChildren && newChildren.length > 0) {
    loading.value = false
  }
})

function handleClick() {
  if (props.node.type === 'file') {
    emit('select', props.node.path)
  } else {
    // Use delayed expand to allow double-click detection
    handleDelayedExpand()
  }
}

function handleExpandClick() {
  // Immediate toggle when clicking chevron directly
  toggleExpand()
}

function handleDelayedExpand() {
  // Cancel any pending expand (in case of double-click)
  if (expandTimeout) {
    clearTimeout(expandTimeout)
    expandTimeout = null
  }
  
  // Delay expand by 200ms to detect double-click
  expandTimeout = setTimeout(() => {
    toggleExpand()
    expandTimeout = null
  }, 200)
}

function toggleExpand() {
  isExpanded.value = !isExpanded.value
  
  if (isExpanded.value) {
    // Show loading if no children loaded yet
    if (!props.node.children || props.node.children.length === 0) {
      loading.value = true
    }
    emit('expand-folder', props.node.path)
  }
}

function handleDoubleClick() {
  if (props.node.type === 'folder') {
    // Cancel pending expand on double-click
    if (expandTimeout) {
      clearTimeout(expandTimeout)
      expandTimeout = null
    }
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
