<template>
  <aside 
    class="border-r border-border/50 flex flex-col bg-sidebar/50 flex-shrink-0 overflow-hidden transition-all duration-150 ease-out"
    :class="visible ? 'w-64' : 'w-0 border-r-0'"
  >
    <div class="w-64 flex flex-col h-full">
      <!-- Repo Selector -->
      <div class="p-3 border-b border-border/50">
        <Button 
          variant="outline" 
          size="sm" 
          class="w-full justify-between px-2 h-8 text-xs font-normal border-dashed" 
          @click="emit('open-repo-selector')"
        >
          <div class="flex items-center truncate">
            <BookMarked class="w-3.5 h-3.5 mr-2 opacity-70" />
            <span class="truncate">{{ repo || 'Select Repository...' }}</span>
          </div>
          <ChevronDown class="w-3 h-3 opacity-50 ml-2 flex-shrink-0" />
        </Button>
      </div>
      
      <!-- File Browser -->
      <div class="flex-1 overflow-auto p-3">
        <FileBrowser 
          :repo="repo" 
          :selected-path="selectedFile"
          @select="emit('select-file', $event)"
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
import { BookMarked, ChevronDown } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { FileBrowser } from '@/components/file-browser'
import UserMenu from './UserMenu.vue'

defineProps<{
  visible: boolean
  repo?: string
  selectedFile?: string | null
}>()

const emit = defineEmits<{
  'open-repo-selector': []
  'select-file': [path: string]
  'open-shared': [mode: 'shared-with-me' | 'shared-by-me']
}>()
</script>
