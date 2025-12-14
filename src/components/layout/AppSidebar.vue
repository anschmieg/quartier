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
      
      <!-- Branch Selector -->
      <div v-if="repo" class="px-3 pb-2">
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
          @select="emit('select-file', $event)"
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
import { computed } from 'vue'
import { BookMarked, ChevronDown } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { FileBrowser } from '@/components/file-browser'
import UserMenu from './UserMenu.vue'
import BranchSelector from './BranchSelector.vue'

const props = defineProps<{
  visible: boolean
  repo?: string
  selectedFile?: string | null
}>()

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
}>()
</script>
