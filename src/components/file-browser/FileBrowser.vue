<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3 px-2">
      <span class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Files</span>
      <FileFilters v-if="repo" v-model:showAll="showAllFiles" />
    </div>
    
    <!-- Breadcrumb navigation -->
    <PathBreadcrumbs 
      v-if="repo"
      :current-path="currentPath" 
      @navigate="navigateToPath"
      class="px-2"
    />
    
    <!-- Empty state -->
    <div v-if="!repo" class="text-sm text-muted-foreground px-2 py-4 text-center">
      No repository selected.
    </div>
    
    <!-- File tree -->
    <FileTree 
      v-else
      :files="filteredFiles" 
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
import FileTree from './FileTree.vue'
import PathBreadcrumbs from './PathBreadcrumbs.vue'
import FileFilters from './FileFilters.vue'
import { githubService } from '@/services/github'
import { useAuth } from '@/composables/useAuth'
import { kvSync } from '@/services/storage'

interface FileItem {
  path: string
  type: 'file' | 'dir'
}

const props = defineProps<{
  repo?: string
  selectedPath?: string | null
}>()

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

// Watch for repo changes
watch(() => props.repo, async (newRepo) => {
  if (newRepo) {
    await loadRepoContents(newRepo, '')
  } else {
    files.value = []
    currentPath.value = ''
  }
}, { immediate: true })

const { isHost } = useAuth()

// ...

async function loadRepoContents(repoFullName: string, path: string) {
  const [owner, name] = repoFullName.split('/')
  if (!owner || !name) return
  
  // If Host, use GitHub API
  if (isHost.value) {
      try {
        const contents = await githubService.loadRepo(owner, name, path)
        files.value = contents.map((item: { path: string, type: string }) => ({
          path: item.path,
          type: item.type as 'file' | 'dir'
        }))
        currentPath.value = path
      } catch (error) {
        console.error('Failed to load repo contents from GitHub:', error)
        // Fallback to KV? No, Host should use GitHub.
      }
      return
  }
  
  // If Guest, use KV list
  // KV returns flattened list of ALL files. We need to filter for the current path/folder.
  try {
      const allFiles = await kvSync.list(owner, name)
      if (!allFiles) {
          files.value = []
          return
      }
      
      // Filter logic:
      // If path is empty, show files with no slashes, OR folders (first part of path)
      // If path is 'foo', show files starting with 'foo/'
      
      const filtered = new Map<string, FileItem>()
      
      allFiles.forEach(f => {
          if (!f.path.startsWith(path ? path + '/' : '')) return
          
          const relative = path ? f.path.slice(path.length + 1) : f.path
          const parts = relative.split('/')
          
          if (parts.length === 1) {
              // It's a file in the current folder
              filtered.set(parts[0], { path: f.path, type: 'file' })
          } else {
              // It's a folder
              const folderName = parts[0]
              const folderPath = path ? `${path}/${folderName}` : folderName
              filtered.set(folderName, { path: folderPath, type: 'dir' })
          }
      })
      
      files.value = Array.from(filtered.values()).sort((a, b) => {
          if (a.type === b.type) return a.path.localeCompare(b.path)
          return a.type === 'dir' ? -1 : 1
      })
      
      currentPath.value = path
  } catch (error) {
      console.error('Failed to load guest contents:', error)
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
  
  // If Guest, use KV list
  if (!isHost.value) {
      try {
          const allFiles = await kvSync.list(owner, name)
          if (!allFiles) return
          
          const newItems: FileItem[] = []
          const processedFolders = new Set<string>()

          allFiles.forEach(f => {
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
                  if (!processedFolders.has(subFolderName)) {
                      const subFolderPath = `${folderPath}/${subFolderName}`
                      // Ensure not a duplicate of existing
                      if (!files.value.some(ex => ex.path === subFolderPath)) {
                           newItems.push({ path: subFolderPath, type: 'dir' })
                      }
                      processedFolders.add(subFolderName)
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
    const contents = await githubService.loadRepo(owner, name, folderPath)
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
