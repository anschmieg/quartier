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
      @select="handleSelect"
      @enter-folder="handleEnterFolder"
      @expand-folder="handleExpandFolder"
      @create-file="emit('create-file', $event)"
      @create-folder="emit('create-folder', $event)"
      @rename="emit('rename', $event)"
      @delete="emit('delete', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import FileTree from './FileTree.vue'
import PathBreadcrumbs from './PathBreadcrumbs.vue'
import FileFilters from './FileFilters.vue'
import { githubService } from '@/services/github'

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

async function loadRepoContents(repoFullName: string, path: string) {
  const [owner, name] = repoFullName.split('/')
  if (!owner || !name) return
  
  try {
    const contents = await githubService.loadRepo(owner, name, path)
    files.value = contents.map((item: { path: string, type: string }) => ({
      path: item.path,
      type: item.type as 'file' | 'dir'
    }))
    currentPath.value = path
  } catch (error) {
    console.error('Failed to load repo contents:', error)
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
  
  // Check if already loaded
  const existingChildren = files.value.some(f => 
    f.path.startsWith(folderPath + '/') && f.path !== folderPath
  )
  if (existingChildren) return
  
  const [owner, name] = props.repo.split('/')
  if (!owner || !name) return
  
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

async function navigateToPath(path: string) {
  if (!props.repo) return
  await loadRepoContents(props.repo, path)
}
</script>
