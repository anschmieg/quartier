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
          v-if="loading && isExpanded && (!node.children || node.children.length === 0)"
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

    <!-- Children container -->
    <div 
      v-if="node.type === 'folder'"
      class="grid transition-[grid-template-rows] duration-500 ease-out"
      :class="isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
    >
      <div class="overflow-hidden">
        <!-- Staggered children with TransitionGroup -->
        <TransitionGroup
          tag="div"
          @before-enter="onBeforeEnter"
          @enter="onEnter"
          @leave="onLeave"
        >
          <FileTreeNode
            v-for="(child, index) in visibleChildren"
            :key="child.id"
            :node="child"
            :selected-path="selectedPath"
            :level="level + 1"
            :data-index="index"
            @select="emit('select', $event)"
            @enter-folder="emit('enter-folder', $event)"
            @expand-folder="emit('expand-folder', $event)"
            @context-menu="emit('context-menu', $event)"
          />
        </TransitionGroup>
        
        <!-- Loading / Empty messages -->
        <div 
          v-if="isExpanded && loading && (!node.children || node.children.length === 0)"
          key="loading-indicator"
          class="flex items-center gap-2 text-xs text-muted-foreground py-1 animate-pulse"
          :style="{ paddingLeft: `${(level + 1) * 12 + 8}px` }"
        >
          Loading...
        </div>
        <div 
          v-else-if="isExpanded && !loading && (!node.children || node.children.length === 0)"
          key="empty-indicator"
          class="text-xs text-muted-foreground/70 italic py-1"
          :style="{ paddingLeft: `${(level + 1) * 12 + 8}px` }"
        >
          Empty folder
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
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
let loadingTimeout: ReturnType<typeof setTimeout> | null = null

// Adjusted stagger delay to create a deliberate "unroll" effect
const STAGGER_DELAY = 30 // ms per item

// Visible children
const visibleChildren = computed(() => {
  if (!isExpanded.value || !props.node.children) return []
  return props.node.children
})

// Watch for children being loaded
watch(() => props.node.children?.length, () => {
  loading.value = false
  if (loadingTimeout) {
    clearTimeout(loadingTimeout)
    loadingTimeout = null
  }
}, { immediate: false })

// Animation Hooks
function onBeforeEnter(el: Element) {
  const htmlEl = el as HTMLElement
  htmlEl.style.opacity = '0'
  htmlEl.style.transform = 'translateY(-10px)'
}

function onEnter(el: Element, done: () => void) {
  const htmlEl = el as HTMLElement
  const index = Number(htmlEl.dataset.index) || 0
  const delay = index * STAGGER_DELAY
  
  // Slower transition for "unroll" feel
  htmlEl.style.transition = `opacity 300ms ease-out ${delay}ms, transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}ms`
  
  void htmlEl.offsetHeight // trigger reflow
  
  htmlEl.style.opacity = '1'
  htmlEl.style.transform = 'translateY(0)'
  
  setTimeout(done, delay + 300)
}

function onLeave(el: Element, done: () => void) {
  const htmlEl = el as HTMLElement
  htmlEl.style.transition = 'opacity 200ms ease, transform 200ms ease'
  htmlEl.style.opacity = '0'
  htmlEl.style.transform = 'translateY(-5px)'
  setTimeout(done, 200)
}

function handleClick() {
  if (props.node.type === 'file') {
    emit('select', props.node.path)
  } else {
    // PREFETCH: Start loading immediately
    if (!isExpanded.value && (!props.node.children || props.node.children.length === 0)) {
       loading.value = true
       emit('expand-folder', props.node.path)
       
       // Fallback timeout
       if (loadingTimeout) clearTimeout(loadingTimeout)
       loadingTimeout = setTimeout(() => { loading.value = false }, 5000)
    }
    
    // VISUAL DELAY: Wait 200ms to expand UI (double-click guard)
    handleDelayedExpand()
  }
}

function handleExpandClick() {
  // Chevron click: Immediate visual toggle + fetch
  toggleExpand()
}

function handleDelayedExpand() {
  if (expandTimeout) {
    clearTimeout(expandTimeout)
    expandTimeout = null
  }
  
  expandTimeout = setTimeout(() => {
    // Only toggle visual state here
    toggleExpandVisual()
    expandTimeout = null
  }, 200)
}

function toggleExpand() {
  // Logic for immediate toggle (e.g. chevron click)
  if (!isExpanded.value) {
     // Trigger fetch if needed
     if (!props.node.children || props.node.children.length === 0) {
       loading.value = true
       emit('expand-folder', props.node.path)
       if (loadingTimeout) clearTimeout(loadingTimeout)
       loadingTimeout = setTimeout(() => { loading.value = false }, 5000)
     }
  }
  toggleExpandVisual()
}

function toggleExpandVisual() {
  isExpanded.value = !isExpanded.value
  if (!isExpanded.value) {
     loading.value = false // Reset loading if collapsed
  }
}

function handleDoubleClick() {
  if (props.node.type === 'folder') {
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
