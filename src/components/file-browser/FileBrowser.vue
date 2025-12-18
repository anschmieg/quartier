<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3 px-2">
      <span class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Files</span>
      <FileFilters v-if="repo" v-model:showAll="showAllFiles" />
    </div>
    
    <!-- Search input -->
    <div v-if="repo && !error" class="px-2 mb-2">
      <Input 
        v-model="searchQuery"
        placeholder="Search files..."
        class="h-7 text-xs"
      />
    </div>
    
    <!-- Breadcrumb navigation -->
    <PathBreadcrumbs 
      v-if="repo && !error"
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
      v-else-if="!repo"
      :icon="FolderOpen"
      title="No repository selected"
      description="Select a repository from the header to get started"
      class="px-2 py-4"
    />
    
    <EmptyState
      v-else-if="files.length === 0"
      :icon="searchQuery ? SearchX : FolderOpen"
      title="No files found"
      :description="searchQuery ? 'No files match your search' : 'This folder is empty'"
      class="px-2 py-4"
    >
        <template #actions v-if="!searchQuery && repo">
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
import { githubService } from '@/services/github'
import { kvSync } from '@/services/storage'

interface FileItem {
  path: string
  type: 'file' | 'dir'
}

const props = withDefaults(defineProps<{
  repo?: string
  selectedPath?: string | null
  isHost?: boolean
  allowedPaths?: string[]
}>(), {
  isHost: false,
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

// Persisted expanded folders (per repo)
const expandedFolders = useStorage<Record<string, string[]>>('quartier:expandedFolders', {})

// Get expanded folders for current repo
const currentExpandedFolders = computed(() => {
  return props.repo ? (expandedFolders.value[props.repo] || []) : []
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

// Watch for repo or host changes
watch([() => props.repo, () => props.isHost], async ([newRepo, _newIsHost]) => {
  if (newRepo) {
    // If isHost changed from false to true, we might need to reload specific bits, but generally reloading repo is safe
    await loadRepoContents(newRepo, '')
  } else {
    files.value = []
    currentPath.value = ''
    error.value = null
  }
}, { immediate: true })

async function retryLoad() {
    if (props.repo) {
        await loadRepoContents(props.repo, currentPath.value)
    }
}

async function loadRepoContents(repoFullName: string, path: string) {
  const [owner, name] = repoFullName.split('/')
  if (!owner || !name) return
  
  loading.value = true
  error.value = null
  
  // If Host, use GitHub API
  if (props.isHost) {
      try {
        // 1. Load current path
        let allItems = await githubService.loadRepo(owner, name, path) as any[]
        
        // 2. Load expanded folders (recursive hydration)
        // We only do this if we are loading the root (initial load) or a specific refresh
        if (path === '') {
            const expanded = currentExpandedFolders.value
            if (expanded.length > 0) {
                // Fetch all expanded folders in parallel
                // Note: GitHub API might rate limit us if too many, but for now this is the correct logic
                const expandedPromises = expanded.map(folderPath => 
                    (githubService.loadRepo(owner, name, folderPath) as any)
                        .then((items: any[]) => items) // Return items
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
        const uniqueItems = new Map<string, any>()
        allItems.forEach((item: any) => uniqueItems.set(item.path, item))
        
        files.value = Array.from(uniqueItems.values()).map((item: any) => ({
          path: item.path,
          type: item.type as 'file' | 'dir'
        }))
        currentPath.value = path
      } catch (e: any) {
        console.error('Failed to load repo contents from GitHub:', e)
        error.value = e.message || 'Failed to load repository contents'
      } finally {
        loading.value = false
      }
      return
  }
  
  // If Guest, use KV list
  // KV returns flattened list of ALL files.
  // We simply load EVERYTHING and let the FileTree component handle hierarchy logic via buildFileTree.
  try {
      const allFiles = await kvSync.list(owner, name)
      if (!allFiles) {
          files.value = []
          loading.value = false
          return
      }

      // Filter by allowed paths (if guest/restricted perms)
      const visibleFiles = allFiles.filter(f => {
          if (!props.allowedPaths || props.allowedPaths.length === 0) return true
          const fullPath = `${owner}/${name}/${f.path}`
          return props.allowedPaths.some(allowed => {
              if (allowed.endsWith('/*')) {
                  const allowedDir = allowed.slice(0, -2)
                  return fullPath.startsWith(allowedDir + '/')
              }
              return fullPath === allowed || fullPath.startsWith(allowed + '/')
          })
      })
      
      // Guest Mode Simplification:
      // We do NOT filter by 'currentPath' or folder depth here.
      // We pass ALL visible files to the tree, and the tree renders the structure.
      // This solves the 'empty folder' issue because all nested files are present.
      
      files.value = visibleFiles.map(f => ({
          path: f.path,
          type: 'file' as const // KV only lists files, folders are implicit
      })).sort((a, b) => a.path.localeCompare(b.path))
      
      // We still update currentPath to support breadcrumbs if needed, 
      // but strictly speaking for a pure tree view, 'currentPath' is less relevant than 'selectedPath'.
      currentPath.value = path

  } catch (e: any) {
      console.error('Failed to load guest contents:', e)
      error.value = e.message || 'Failed to load files'
  } finally {
      loading.value = false
  }
}

function handleSelect(path: string) {
  emit('select', path)
}

async function handleEnterFolder(folderPath: string) {
  if (!props.repo) return
  await loadRepoContents(props.repo, folderPath)
}

async function handleExpandFolder(folderPath: string) {
  if (!props.repo) return
  
  // Track expansion
  addExpandedFolder(folderPath)
  
  // Check if already loaded
  const existingChildren = files.value.some(f => 
    f.path.startsWith(folderPath + '/') && f.path !== folderPath
  )
  if (existingChildren) return
  
  const [owner, name] = props.repo.split('/')
  if (!owner || !name) return
  
  // Don't show full page loading spinner for expansion
  // But maybe show a toast or small indicator if it fails?
  // For now we just log errors as before
  
  // If Guest, use KV list
  if (!props.isHost) {
      try {
          const allFiles = await kvSync.list(owner, name)
          if (!allFiles) return
          
          // Filter by allowed paths
          const visibleFiles = allFiles.filter(f => {
              if (!props.allowedPaths || props.allowedPaths.length === 0) return true
              const fullPath = `${owner}/${name}/${f.path}`
              return props.allowedPaths.some(allowed => {
                  if (allowed.endsWith('/*')) {
                      const allowedDir = allowed.slice(0, -2)
                      return fullPath.startsWith(allowedDir + '/')
                  }
                  return fullPath === allowed || fullPath.startsWith(allowed + '/')
              })
          })

          const newItems: FileItem[] = []
          const processedFolders = new Set<string>()

          visibleFiles.forEach(f => {
              // We want direct children of folderPath
              if (!f.path.startsWith(folderPath + '/')) return
              
              const relative = f.path.slice(folderPath.length + 1)
              const parts = relative.split('/')
              
              if (parts.length === 1) {
                  // File
                  newItems.push({ path: f.path, type: 'file' })
              } else {
                  // Subfolder
                  const subFolderName = parts[0]
                  if (subFolderName) {
                      if (!processedFolders.has(subFolderName)) {
                          const subFolderPath = `${folderPath}/${subFolderName}`
                          // Ensure not a duplicate of existing
                          if (!files.value.some(ex => ex.path === subFolderPath)) {
                               newItems.push({ path: subFolderPath, type: 'dir' })
                          }
                          processedFolders.add(subFolderName)
                      }
                  }
              }
          })
          
          files.value = [...files.value, ...newItems]
      } catch (error) {
          console.error('Failed to expand folder (guest):', error)
      }
      return
  }

  // Host logic (GitHub)
  try {
    const contents = await githubService.loadRepo(owner, name, folderPath) as any[]
    const newItems = contents.map((item: { path: string, type: string }) => ({
      path: item.path,
      type: item.type as 'file' | 'dir'
    }))
    files.value = [...files.value, ...newItems]
  } catch (error) {
    console.error('Failed to expand folder:', error)
  }
}

function handleCollapseFolder(folderPath: string) {
  if (!props.repo) return
  removeExpandedFolder(folderPath)
}

function addExpandedFolder(folderPath: string) {
  if (!props.repo) return
  const current = expandedFolders.value[props.repo] || []
  if (!current.includes(folderPath)) {
    expandedFolders.value = {
      ...expandedFolders.value,
      [props.repo]: [...current, folderPath]
    }
  }
}

function removeExpandedFolder(folderPath: string) {
  if (!props.repo) return
  const current = expandedFolders.value[props.repo] || []
  expandedFolders.value = {
    ...expandedFolders.value,
    [props.repo]: current.filter(p => p !== folderPath)
  }
}

async function navigateToPath(path: string) {
  if (!props.repo) return
  await loadRepoContents(props.repo, path)
}
</script>
