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
              :roomId="collabRoomId"
              :userEmail="userEmail"
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
    <CommandPalette 
      ref="commandPaletteRef" 
      :files="recentFiles" 
      @select="selectFile" 
      @action="handlePaletteAction"
    />
    <RepoSelector v-model:open="showRepoSelector" @select="handleRepoSelect" />
    <CommitDialog 
      ref="commitDialogRef" 
      :file-path="currentFile || ''" 
      @confirm="handleCommit"
    />
    <Toast ref="toastRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useStorage } from '@vueuse/core'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import EditorWrapper from '@/components/editor/EditorWrapper.vue'
import PreviewPanel from '@/components/preview/PreviewPanel.vue'
import CommandPalette from '@/components/command/CommandPalette.vue'
import RepoSelector from '@/components/github/RepoSelector.vue'
import CommitDialog from '@/components/dialogs/CommitDialog.vue'
import Toast from '@/components/ui/Toast.vue'
import { useMagicKeys, whenever } from '@vueuse/core'
import { githubService } from '@/services/github'
import { cachedFileSystem, kvSync } from '@/services/storage'

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
const commitDialogRef = ref()
const toastRef = ref()
const showRepoSelector = ref(false)
const recentFiles = ref<string[]>([])
const editorWrapperRef = ref<InstanceType<typeof EditorWrapper> | null>(null)
const userEmail = ref<string | undefined>(undefined)

// Computed room ID for collaboration
const collabRoomId = computed(() => {
  if (!repo.value || !currentFile.value) return undefined
  return `quartier:${repo.value}/${currentFile.value}`
})

// Auto-sync state
let lastSyncedContent = ''
let autoSyncInterval: ReturnType<typeof setInterval> | null = null

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
  console.log('[AppLayout] onMounted - repo:', repo.value, 'currentFile:', currentFile.value)
  
  // Fetch user email for collaboration
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      userEmail.value = data.email
      console.log('[AppLayout] User email:', userEmail.value)
    }
  } catch (error) {
    console.log('[AppLayout] Not authenticated or running locally')
  }
  
  if (repo.value && currentFile.value) {
    console.log('[AppLayout] Restoring file on mount:', currentFile.value)
    await selectFile(currentFile.value)
  } else {
    console.log('[AppLayout] No file to restore')
  }
  
  // Start auto-sync every 60 seconds
  autoSyncInterval = setInterval(async () => {
    if (!repo.value || !currentFile.value) return
    if (fileContent.value === lastSyncedContent) return // No changes
    if (fileContent.value === 'Loading...') return
    
    const [owner, name] = repo.value.split('/')
    if (!owner || !name) return
    
    console.log('[AutoSync] Saving to KV...')
    const saved = await kvSync.put(owner, name, currentFile.value, fileContent.value)
    if (saved) {
      lastSyncedContent = fileContent.value
      console.log('[AutoSync] Saved successfully')
    }
  }, 60000) // Every 60 seconds
})

onUnmounted(() => {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval)
    autoSyncInterval = null
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
    
    // Try to load from KV first (cross-device sync)
    const kvData = await kvSync.get(owner, name, path)
    const localContent = await cachedFileSystem.getCache(owner, name, path)
    
    // Determine which source to use
    if (kvData && localContent) {
      // Both exist - use KV since it's the server source of truth
      console.log('[AppLayout] Loaded from KV (cross-device):', path)
      fileContent.value = kvData.content
      // Update local cache with KV content
      await cachedFileSystem.setCache(owner, name, path, kvData.content)
      fileLoading.value = false
      return
    }
    
    if (kvData) {
      console.log('[AppLayout] Loaded from KV:', path)
      fileContent.value = kvData.content
      await cachedFileSystem.setCache(owner, name, path, kvData.content)
      fileLoading.value = false
      return
    }
    
    if (localContent !== null) {
      console.log('[AppLayout] Loaded from local cache:', path)
      fileContent.value = localContent
      fileLoading.value = false
      return
    }
    
    // Not in KV or local cache, load from GitHub
    const content = await githubService.readFile(owner, name, path)
    
    // Cache the content locally
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
      // Save to local cache immediately
      await cachedFileSystem.setCache(owner, name, currentFile.value, newContent)
      
      // Also sync to KV (debounced separately in the background)
      kvSync.put(owner, name, currentFile.value, newContent).catch(err => {
        console.warn('[AppLayout] KV sync failed (will retry):', err)
      })
    }
  }
}

async function saveFile() {
  if (!currentFile.value || !repo.value) return
  
  // Open the commit dialog
  commitDialogRef.value?.open()
}

async function handleCommit(message: string) {
  if (!currentFile.value || !repo.value) return
  
  const [owner, name] = repo.value.split('/')
  if (!owner || !name) return
  
  console.log('[AppLayout] Committing:', currentFile.value)
  
  const result = await githubService.commitChanges(
    owner,
    name,
    currentFile.value,
    fileContent.value,
    message
  )
  
  if (result.success) {
    console.log('[AppLayout] Commit successful:', result.commitSha)
    // Clear local cache since it's now committed
    await cachedFileSystem.clearCache(owner, name, currentFile.value)
    toastRef.value?.success(`Committed: ${result.commitSha?.slice(0, 7)}`)
  } else {
    console.error('[AppLayout] Commit failed:', result.error)
    toastRef.value?.error(`Commit failed: ${result.error}`)
  }
}

function handleRepoSelect(selectedRepo: { owner: string, name: string, full_name: string }) {
  repo.value = selectedRepo.full_name
  currentFile.value = null
  fileContent.value = ''
}

function handlePaletteAction(action: string) {
  switch (action) {
    case 'save':
      saveFile()
      break
    case 'toggle-sidebar':
      showSidebar.value = !showSidebar.value
      break
    case 'toggle-preview':
      showPreview.value = !showPreview.value
      break
    case 'toggle-mode':
      editorMode.value = editorMode.value === 'visual' ? 'source' : 'visual'
      break
    case 'go-to-repo':
      showRepoSelector.value = true
      break
    case 'new-file':
      toastRef.value?.info('New file: Not yet implemented')
      break
    default:
      console.log('[AppLayout] Unknown palette action:', action)
  }
}
</script>
