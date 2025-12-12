<template>
  <div class="flex flex-col h-screen bg-background text-foreground overflow-hidden">
    <!-- Header -->
    <AppHeader 
      :can-save="!!currentFile"
      :sidebar-visible="showSidebar"
      :show-preview="showPreview"
      :editor-mode="editorMode"
      :get-editor="getEditorInstance"
      @command-palette="openCommandPalette"
      @save="saveFile"
      @toggle-sidebar="showSidebar = !showSidebar"
      @update:show-preview="showPreview = $event"
      @update:editor-mode="editorMode = $event"
    />

    <!-- Main Layout -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <AppSidebar 
        :visible="showSidebar"
        :repo="repo"
        :selected-file="currentFile"
        @open-repo-selector="showRepoSelector = true"
        @select-file="selectFile"
      />

      <!-- Main Content -->
      <main class="flex-1 flex flex-col h-full min-w-0 bg-background/50 transition-all duration-150">
        <!-- Editor/Preview Split -->
        <div class="flex-1 flex overflow-hidden relative">
          <div 
            :class="showPreview ? 'w-1/2' : 'w-full'" 
            class="h-full overflow-hidden transition-all duration-150"
          >
            <EditorWrapper 
              ref="editorWrapperRef"
              :initial-content="fileContent"
              :mode="editorMode"
              @update:content="updateContent"
            />
          </div>
          
          <!-- Preview Panel with Fade Animation -->
          <Transition
            enter-active-class="transition-opacity duration-200"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition-opacity duration-150"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
            mode="out-in"
          >
            <PreviewPanel 
              v-if="showPreview" 
              :content="fileContent"
              class="absolute right-0 top-0 bottom-0 w-1/2 border-l border-border/50"
            />
          </Transition>
        </div>
      </main>
    </div>

    <!-- Modals -->
    <CommandPalette ref="commandPaletteRef" :files="[]" @select="selectFile" />
    <RepoSelector v-model:open="showRepoSelector" @select="handleRepoSelect" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useStorage } from '@vueuse/core'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import EditorWrapper from '@/components/editor/EditorWrapper.vue'
import PreviewPanel from '@/components/preview/PreviewPanel.vue'
import CommandPalette from '@/components/command/CommandPalette.vue'
import RepoSelector from '@/components/github/RepoSelector.vue'
import { useMagicKeys, whenever } from '@vueuse/core'
import { githubService } from '@/services/github'
import { cachedFileSystem } from '@/services/storage'

// Persisted State (localStorage)
const repo = useStorage<string | undefined>('quartier:repo', undefined)
const currentFile = useStorage<string | null>('quartier:currentFile', null)
const showSidebar = useStorage('quartier:showSidebar', true)
const showPreview = useStorage('quartier:showPreview', false)
const editorMode = useStorage<'visual' | 'source'>('quartier:editorMode', 'visual')

// Transient State (not persisted)
const fileContent = ref('')
const fileLoading = ref(false)
const commandPaletteRef = ref()
const showRepoSelector = ref(false)
const editorWrapperRef = ref<InstanceType<typeof EditorWrapper> | null>(null)

// Getter for the editor instance (passed down to toolbar)
// This must be a function so the toolbar can call it lazily
const getEditorInstance = () => {
  // EditorWrapper exposes getMilkdownEditor
  // @ts-ignore - accessing exposed method
  return editorWrapperRef.value?.getMilkdownEditor?.() ?? undefined
}

// Keyboard shortcuts
const { Meta_K, Ctrl_K } = useMagicKeys()
whenever(() => Meta_K?.value || Ctrl_K?.value, () => openCommandPalette())

// Restore file content on mount
onMounted(async () => {
  if (repo.value && currentFile.value) {
    console.log('[AppLayout] Restoring file on mount:', currentFile.value)
    await selectFile(currentFile.value)
  }
})

function openCommandPalette() {
  commandPaletteRef.value?.open()
}

async function selectFile(path: string) {
  if (!repo.value) return
  
  const [owner, name] = repo.value.split('/')
  if (!owner || !name) return
  
  try {
    fileLoading.value = true
    currentFile.value = path
    fileContent.value = 'Loading...'
    
    console.log('Loading file:', path)
    
    // Check cache first
    const cached = await cachedFileSystem.getCache(owner, name, path)
    if (cached !== null) {
      console.log('[AppLayout] Loaded from cache:', path)
      fileContent.value = cached
      fileLoading.value = false
      return
    }
    
    // Not cached, load from GitHub
    const content = await githubService.readFile(owner, name, path)
    
    // Cache the content
    await cachedFileSystem.setCache(owner, name, path, content)
    
    fileContent.value = content
    console.log('File loaded from GitHub, length:', content.length)
  } catch (error) {
    console.error('Failed to load file:', error)
    fileContent.value = `# Error loading file\n\nFailed to load ${path}:\n${error instanceof Error ? error.message : 'Unknown error'}`
  } finally {
    fileLoading.value = false
  }
}

async function updateContent(newContent: string) {
  fileContent.value = newContent
  
  // Persist to cache
  if (repo.value && currentFile.value) {
    const [owner, name] = repo.value.split('/')
    if (owner && name) {
      await cachedFileSystem.setCache(owner, name, currentFile.value, newContent)
    }
  }
}

async function saveFile() {
  if (currentFile.value) {
    console.log('Saving:', currentFile.value)
    // TODO: Implement save to GitHub
  }
}

function handleRepoSelect(selectedRepo: { owner: string, name: string, full_name: string }) {
  repo.value = selectedRepo.full_name
  currentFile.value = null
  fileContent.value = ''
}
</script>
