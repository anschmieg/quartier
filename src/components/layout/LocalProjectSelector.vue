<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[425px] p-0 overflow-hidden gap-0">
      <DialogHeader class="px-4 py-3 border-b">
        <DialogTitle>Local Projects</DialogTitle>
        <DialogDescription class="hidden">Manage your local folders and sandboxes</DialogDescription>
      </DialogHeader>
      
      <div class="p-4">
        <div class="flex gap-2 mb-4">
            <Button variant="outline" size="sm" class="flex-1" @click="handleOpenDisk">
                <FolderOpen class="w-4 h-4 mr-2" />
                Open Folder...
            </Button>
            <Button variant="outline" size="sm" class="flex-1" @click="handleCreateSandbox">
                <Plus class="w-4 h-4 mr-2" />
                New Sandbox
            </Button>
        </div>

        <Input 
          v-model="searchQuery" 
          placeholder="Search local projects..." 
          class="mb-4"
        />

        <div v-if="loading" class="flex justify-center py-8">
          <LoadingSpinner size="md" message="Loading projects..." />
        </div>

        <div v-else class="h-[300px] overflow-y-auto -mx-2 px-2 space-y-1">
          <div
            v-for="project in filteredProjects"
            :key="project.id"
            class="group w-full flex items-center px-2 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground text-left transition-colors"
          >
            <div class="flex-1 min-w-0 flex items-center cursor-pointer" @click="selectProject(project)">
                <component :is="project.type === 'disk' ? Folder : Laptop" class="w-4 h-4 mr-2 text-muted-foreground" />
                <div class="flex-1 min-w-0">
                  <div class="font-medium truncate">{{ project.name }}</div>
                  <div class="text-[10px] uppercase opacity-50">{{ project.type }}</div>
                </div>
                <Check v-if="project.id === currentProject" class="w-4 h-4 ml-2 text-primary" />
            </div>
            
            <Button 
                variant="ghost" 
                size="icon" 
                class="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity ml-2 text-muted-foreground hover:text-destructive"
                @click.stop="removeProject(project.id)"
            >
                <X class="w-3.5 h-3.5" />
            </Button>
          </div>
          
          <EmptyState
            v-if="filteredProjects.length === 0"
            :icon="Monitor"
            :title="searchQuery ? 'No matching projects' : 'No local projects'"
            :description="searchQuery ? 'Try a different search term' : 'Open a folder or create a sandbox to get started'"
            class="py-8"
          />
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Monitor, Laptop, Folder, FolderOpen, Plus, Check, X } from 'lucide-vue-next'
import { LoadingSpinner } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { storageManager } from '@/services/storageManager'
import type { LocalProvider, LocalProjectMetadata } from '@/services/providers/LocalProvider'

const props = defineProps<{
  open: boolean
  currentProject?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'select', id: string): void
}>()

const projects = ref<LocalProjectMetadata[]>([])
const loading = ref(false)
const searchQuery = ref('')

const filteredProjects = computed(() => {
  if (!searchQuery.value) return projects.value
  const lower = searchQuery.value.toLowerCase()
  return projects.value.filter(p => p.name.toLowerCase().includes(lower))
})

async function loadProjects() {
  loading.value = true
  try {
    const provider = storageManager.allProviders.find(p => p.id === 'local') as LocalProvider
    if (provider) {
      projects.value = await provider.listProjects()
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function selectProject(project: LocalProjectMetadata) {
  emit('select', project.id)
  emit('update:open', false)
}

async function removeProject(id: string) {
  if (!confirm('Remove this project from list? (Files will not be deleted)')) return
  const provider = storageManager.allProviders.find(p => p.id === 'local') as LocalProvider
  if (provider) {
    await provider.removeProject(id)
    await loadProjects()
  }
}

async function handleOpenDisk() {
    const provider = storageManager.allProviders.find(p => p.id === 'local') as LocalProvider
    if (provider) {
        try {
            const id = await provider.openDirectory()
            emit('select', id)
            emit('update:open', false)
        } catch (e: any) {
            alert(e.message)
        }
    }
}

async function handleCreateSandbox() {
    const name = window.prompt('Sandbox Name:', 'my-research')
    if (!name) return
    const provider = storageManager.allProviders.find(p => p.id === 'local') as LocalProvider
    if (provider) {
        const id = await provider.createBrowserProject(name)
        emit('select', id)
        emit('update:open', false)
    }
}

// Load when opened
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    loadProjects()
  }
})
</script>
