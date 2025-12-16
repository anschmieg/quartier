<template>
  <!-- Backdrop for overlay mode -->
  <Transition name="fade">
    <div 
      v-if="mode === 'overlay' && visible" 
      class="fixed inset-0 bg-black/50 z-40"
      @click="emit('close')"
    />
  </Transition>

  <aside 
    ref="sidebarRef"
    class="flex flex-col bg-sidebar/50 flex-shrink-0 overflow-hidden transition-all duration-150 ease-out"
    :class="sidebarClasses"
  >
    <div class="w-64 flex flex-col h-full">
      <!-- Repo Selector -->
      <div class="p-3 border-b border-border/50">
        <Button 
          variant="outline" 
          size="sm" 
          class="w-full justify-between px-2 h-8 text-xs font-normal border-dashed" 
          :class="{ 'opacity-100 cursor-default hover:bg-background': !isHost }"
          @click="isHost && emit('open-repo-selector')"
        >
          <div class="flex items-center truncate">
            <BookMarked class="w-3.5 h-3.5 mr-2 opacity-70" />
            <span class="truncate">{{ repo || (isHost ? 'Select Repository...' : 'Shared Session') }}</span>
          </div>
          <ChevronDown v-if="isHost" class="w-3 h-3 opacity-50 ml-2 flex-shrink-0" />
        </Button>
      </div>
      
      <!-- Branch Selector (Host only) -->
      <div v-if="repo && isHost" class="px-3 pb-2">
        <BranchSelector 
          :owner="repoOwner" 
          :repo="repoName"
          @change="emit('change-branch', $event)"
        />
      </div>
      
      <!-- File Browser -->
      <div class="flex-1 overflow-auto p-3">
        <FileBrowser 
          :repo="repo" 
          :selected-path="selectedFile"
          :is-host="isHost"
          :allowed-paths="allowedPaths"
          @select="handleFileSelect"
          @create-file="emit('create-file', $event)"
          @create-folder="emit('create-folder', $event)"
          @rename="emit('rename-file', $event)"
          @delete="emit('delete-file', $event)"
        />
      </div>

      <!-- User Menu -->
      <div class="p-4 border-t border-border/50">
        <UserMenu @open-shared="emit('open-shared', $event)" />
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { BookMarked, ChevronDown } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { FileBrowser } from '@/components/file-browser'
import UserMenu from './UserMenu.vue'
import BranchSelector from './BranchSelector.vue'
import type { SidebarMode } from '@/composables/useBreakpoints'

const props = withDefaults(defineProps<{
  visible: boolean
  mode?: SidebarMode
  repo?: string
  selectedFile?: string | null
  isHost?: boolean
  allowedPaths?: string[]
}>(), {
  mode: 'persistent',
  isHost: false,
  allowedPaths: () => []
})

// Parse owner/repo from repo string
const repoOwner = computed(() => props.repo?.split('/')[0] || '')
const repoName = computed(() => props.repo?.split('/')[1] || '')

const emit = defineEmits<{
  'open-repo-selector': []
  'select-file': [path: string]
  'open-shared': [mode: 'shared-with-me' | 'shared-by-me']
  'create-file': [parentPath: string]
  'create-folder': [parentPath: string]
  'rename-file': [path: string]
  'delete-file': [path: string]
  'change-branch': [branch: string]
  'close': []
}>()

const sidebarRef = ref<HTMLElement | null>(null)

// Compute dynamic classes based on mode and visibility
const sidebarClasses = computed(() => {
  const base = props.visible ? 'w-64' : 'w-0'
  const border = props.visible ? 'border-r border-border/50' : 'border-r-0'
  
  if (props.mode === 'overlay') {
    // Fixed position, overlays content
    return [
      base,
      border,
      'fixed top-12 left-0 bottom-0 z-50 shadow-xl'
    ]
  }
  
  // persistent and temporary both stay in-flow
  return [base, border]
})

// Handle file selection - auto-close in temporary/overlay modes
function handleFileSelect(path: string) {
  emit('select-file', path)
  if (props.mode !== 'persistent') {
    emit('close')
  }
}

// Click-outside detection for temporary mode
function handleClickOutside(event: MouseEvent) {
  if (
    props.mode === 'temporary' &&
    props.visible &&
    sidebarRef.value &&
    !sidebarRef.value.contains(event.target as Node)
  ) {
    // Don't close if clicking on the sidebar toggle button
    const target = event.target as HTMLElement
    if (target.closest('[data-sidebar-toggle]')) return
    
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true)
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
