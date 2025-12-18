<template>
  <div class="px-3 py-2 space-y-1">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button 
          variant="outline" 
          size="sm" 
          class="w-full justify-between px-2 h-8 text-xs font-normal border-dashed"
        >
          <div class="flex items-center truncate">
            <component :is="sourceIcon" class="w-3.5 h-3.5 mr-2 opacity-70" />
            <span class="truncate">{{ sourceLabel }}</span>
          </div>
          <ChevronDown class="w-3 h-3 opacity-50 ml-2 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-56">
        <DropdownMenuLabel class="text-xs">Storage Sources</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <!-- GitHub -->
        <DropdownMenuItem class="text-xs" @click="handleSourceSelect('github')">
          <Github class="w-3.5 h-3.5 mr-2" />
          <span>GitHub</span>
          <Check v-if="activeProviderId === 'github'" class="w-3 h-3 ml-auto" />
        </DropdownMenuItem>
        
        <!-- Combined Local -->
        <DropdownMenuItem class="text-xs" @click="handleSourceSelect('local')">
          <Monitor class="w-3.5 h-3.5 mr-2" />
          <span>Local</span>
          <Check v-if="activeProviderId === 'local'" class="w-3 h-3 ml-auto" />
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuSeparator />
        <DropdownMenuLabel class="text-[10px] uppercase opacity-50">Cloud Sources</DropdownMenuLabel>
        
        <!-- Google Drive -->
        <DropdownMenuItem class="text-xs" @click="handleSourceSelect('gdrive')">
          <Cloud class="w-3.5 h-3.5 mr-2 text-blue-500" />
          <span>Google Drive</span>
          <Check v-if="activeProviderId === 'gdrive'" class="w-3 h-3 ml-auto" />
        </DropdownMenuItem>
        
        <!-- Nextcloud (Disabled) -->
        <DropdownMenuItem class="text-xs opacity-50 hidden" disabled>
          <Cloud class="w-3.5 h-3.5 mr-2" />
          <span>Nextcloud</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { 
  Github, 
  Monitor,
  Cloud, 
  ChevronDown, 
  Check 
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { storageManager } from '@/services/storageManager'

const activeProviderId = computed(() => storageManager.activeProvider.id)
const activeProject = computed(() => storageManager.activeProject)

const sourceLabel = computed(() => {
  if (activeProviderId.value === 'github') return activeProject.value || 'Select Repo...'
  if (activeProviderId.value === 'local') {
    if (!activeProject.value) return 'Select Local...'
    // Simplify labels for display: 'browser:repo' -> 'repo', 'disk:folder' -> 'folder'
    return activeProject.value.split(':').pop() || activeProject.value
  }
  if (activeProviderId.value === 'gdrive') {
    // For GDrive, project ID is folder ID, but storageManager might store the ID.
    // Ideally we want the Name. For now, showing 'Google Drive' or look up name from cache?
    // Let's just show 'Google Drive' + ID or just 'Google Drive' if active.
    // The storageManager activeProject is just the ID.
    // TODO: Store project Name in storageManager alongside ID or fetch it.
    return 'Google Drive'
  }
  return 'Select Source...'
})

const sourceIcon = computed(() => {
  switch (activeProviderId.value) {
    case 'github': return Github
    case 'local': return Monitor
    case 'gdrive': return Cloud
    default: return Cloud
  }
})

const emit = defineEmits<{
  'select': [providerId: string]
}>()

function handleSourceSelect(id: string) {
  emit('select', id)
}
</script>
