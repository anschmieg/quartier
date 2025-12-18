<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3 px-2">
      <span class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Files</span>
      <FileFilters v-if="project" v-model:showAll="showAllFiles" />
    </div>
    
    <!-- Search input -->
    <div v-if="project && !error" class="px-2 mb-2">
      <Input 
        v-model="searchQuery"
        placeholder="Search files..."
        class="h-7 text-xs"
      />
    </div>
    
    <!-- Breadcrumb navigation -->
    <PathBreadcrumbs 
      v-if="project && !error"
      :current-path="currentPath" 
      @navigate="navigateToPath"
      class="px-2"
    />
    
    <!-- Error State -->
    <div v-if="error" class="px-2 py-4">
      <ErrorMessage 
        title="Failed to load files"
        :message="error"
        action-label="Retry"
        @action="retryLoad"
      />
    </div>

    <!-- Loading State -->
    <div v-else-if="loading" class="flex-1 flex items-center justify-center p-8">
      <LoadingSpinner size="md" message="Loading files..." />
    </div>
    
    <!-- Empty state -->
    <EmptyState
      v-else-if="!project"
      :icon="FolderOpen"
      title="No project selected"
      description="Select a source from the sidebar to get started"
      class="px-2 py-4"
    />
    
    <EmptyState
      v-else-if="files.length === 0"
      :icon="searchQuery ? SearchX : FolderOpen"
      title="No files found"
      :description="searchQuery ? 'No files match your search' : 'This folder is empty'"
      class="px-2 py-4"
    >
        <template #actions v-if="!searchQuery && project">
             <Button size="sm" variant="outline" @click="emit('create-file', currentPath)">
                Create File
             </Button>
        </template>
    </EmptyState>

    <!-- File tree -->
    <FileTree 
      v-else
      :files="searchedFiles" 
      :selected-path="selectedPath"
      :is-dirty="isDirty"
      :expanded-folders="currentExpandedFolders"
      @select="handleSelect"
      @enter-folder="handleEnterFolder"
      @expand-folder="handleExpandFolder"
      @collapse-folder="handleCollapseFolder"
      @create-file="emit('create-file', $event)"
      @create-folder="emit('create-folder', $event)"
      @rename="emit('rename', $event)"
      @delete="emit('delete', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStorage } from '@vueuse/core'
import { FolderOpen, SearchX } from 'lucide-vue-next'
import FileTree from './FileTree.vue'
import PathBreadcrumbs from './PathBreadcrumbs.vue'
import FileFilters from './FileFilters.vue'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorMessage } from '@/components/ui/error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { storageManager } from '@/services/storageManager'

interface FileItem {
  path: string
  type: 'file' | 'dir'
}

const props = withDefaults(defineProps<{
  project?: string | null
  selectedPath?: string | null
  isDirty?: boolean
  allowedPaths?: string[]
}>(), {
  isDirty: false,
  allowedPaths: () => []
})

const emit = defineEmits<{
  'select': [path: string]
  'create-file': [parentPath: string]
  'create-folder': [parentPath: string]
  'rename': [path: string]
  'delete': [path: string]
}>()

// State
const files = ref<FileItem[]>([])
const currentPath = ref('')
const showAllFiles = ref(false)
const searchQuery = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

// Persisted expanded folders (per project)
const expandedFolders = useStorage<Record<string, string[]>>('quartier:expandedFolders', {})

// Get expanded folders for current project
const currentExpandedFolders = computed(() => {
  return props.project ? (expandedFolders.value[props.project] || []) : []
})

// Quarto-relevant file extensions (whitelist)
const QUARTO_EXTENSIONS = new Set([
  '.qmd', '.md', '.rmd', '.ipynb',
  '.yml', '.yaml',
  '.bib', '.csl',
  '.r', '.py', '.jl',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
  '.pdf', '.html',
  '.css', '.scss', '.lua',
])

const filteredFiles = computed(() => {
  const items = showAllFiles.value 
    ? files.value 
    : files.value.filter(f => {
        const parts = f.path.split('/')
        if (parts.some(part => part.startsWith('.'))) return false
        if (f.type === 'dir') return true
        const ext = '.' + f.path.split('.').pop()?.toLowerCase()
        return QUARTO_EXTENSIONS.has(ext)
      })
  return items
})

const searchedFiles = computed(() => {
  if (!searchQuery.value.trim()) {
    return filteredFiles.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return filteredFiles.value.filter(f => {
    const fileName = f.path.split('/').pop()?.toLowerCase() || ''
    return fileName.includes(query)
  })
})

const currentProvider = computed(() => storageManager.activeProvider)

// Watch for project or provider changes
watch(() => props.project, async (newProject) => {
  if (newProject) {
    await loadContents(newProject, '')
  } else {
    files.value = []
    currentPath.value = ''
    error.value = null
  }
}, { immediate: true })

async function retryLoad() {
    if (props.project) {
        await loadContents(props.project, currentPath.value)
    }
}

async function loadContents(project: string, path: string) {
  loading.value = true
  error.value = null
  
  try {
    const provider = currentProvider.value
    // 1. Load current path
    let allItems = await provider.listFiles(project, path)
    
    // 2. Load expanded folders (recursive hydration) - Only needed for providers that don't return full trees
    if (path === '' && provider.id === 'github') { // GitHub is shallow, need hydration
        const expanded = currentExpandedFolders.value
        if (expanded.length > 0) {
            const expandedPromises = expanded.map(folderPath => 
                provider.listFiles(project, folderPath)
                    .catch((e: any) => {
                        console.warn(`Failed to hydrate folder ${folderPath}:`, e)
                        return []
                    })
            )
            
            const expandedResults = await Promise.all(expandedPromises)
            expandedResults.forEach(items => {
                allItems = [...allItems, ...items]
            })
        }
    }

    // Deduplicate items based on path
    const uniqueItems = new Map<string, FileItem>()
    allItems.forEach((item: FileItem) => uniqueItems.set(item.path, item))
    
    files.value = Array.from(uniqueItems.values())
    currentPath.value = path
  } catch (e: any) {
    console.error(`[FileBrowser] Failed to load contents from ${currentProvider.value.name}:`, e)
    error.value = e.message || `Failed to load ${currentProvider.value.name} contents`
  } finally {
    loading.value = false
  }
}

function handleSelect(path: string) {
  emit('select', path)
}

async function handleEnterFolder(folderPath: string) {
  if (!props.project) return
  await loadContents(props.project, folderPath)
}

async function handleExpandFolder(folderPath: string) {
  if (!props.project) return
  
  // Track expansion
  addExpandedFolder(folderPath)
  
  const provider = currentProvider.value
  
  // Check if children already loaded (only for shallow providers like GitHub)
  const existingChildren = files.value.some(f => 
    f.path.startsWith(folderPath + '/') && f.path !== folderPath
  )
  if (existingChildren) return
  
  try {
    const contents = await provider.listFiles(props.project, folderPath)
    files.value = [...files.value, ...contents]
  } catch (error) {
    console.error('Failed to expand folder:', error)
  }
}

function handleCollapseFolder(folderPath: string) {
  if (!props.project) return
  removeExpandedFolder(folderPath)
}

function addExpandedFolder(folderPath: string) {
  if (!props.project) return
  const current = expandedFolders.value[props.project] || []
  if (!current.includes(folderPath)) {
    expandedFolders.value = {
      ...expandedFolders.value,
      [props.project]: [...current, folderPath]
    }
  }
}

function removeExpandedFolder(folderPath: string) {
  if (!props.project) return
  const current = expandedFolders.value[props.project] || []
  expandedFolders.value = {
    ...expandedFolders.value,
    [props.project]: current.filter(p => p !== folderPath)
  }
}

async function navigateToPath(path: string) {
  if (!props.project) return
  await loadContents(props.project, path)
}
</script>
