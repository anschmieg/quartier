<template>
  <div class="flex flex-col h-screen bg-background text-foreground overflow-hidden">
    <!-- Header -->
    <AppHeader 
      :can-save="!!currentFile"
      :sidebar-visible="showSidebar"
      :show-preview="showPreview"
      :editor-mode="editorMode"
      :get-editor="getEditorInstance"
      :can-share="!!currentFile && !!repo"
      :session-member-count="sessionMemberCount"
      :connection-status="connectionStatus"
      :auto-save-status="autoSaveStatus"
      @command-palette="openCommandPalette"
      @save="saveFile"
      @share="openShareDialog"
      @toggle-sidebar="showSidebar = !showSidebar"
      @update:show-preview="showPreview = $event"
      @update:editor-mode="editorMode = $event"
    />

    <!-- Main Layout -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <AppSidebar 
        :visible="showSidebar"
        :mode="sidebarMode"
        :repo="repo"
        :selected-file="currentFile"
        :is-host="isHost"
        :allowed-paths="allowedPaths"
        @open-repo-selector="isHost ? showRepoSelector = true : null"
        @select-file="selectFile"
        @open-shared="openSharedSessions"
        @create-file="handleCreateFile"
        @create-folder="handleCreateFolder"
        @rename-file="handleRenameFile"
        @delete-file="handleDeleteFile"
        @close="showSidebar = false"
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
              :enableCollab="isShared"
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
      :original-content="originalFileContent"
      :current-content="fileContent"
      @confirm="handleCommit"
    />
    <ShareDialog 
      ref="shareDialogRef"
      :file-path="fullFilePath"
    />
    <SharedSessionsDialog ref="sharedSessionsDialogRef" />
    <JoinSessionDialog v-if="route.name === 'share'" @joined="handleJoined" />
    <Toast ref="toastRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'

const { isAuthenticated, isAccessAuthenticated, isHost, user, accessUser } = useAuth()
import { useStorage } from '@vueuse/core'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import EditorWrapper from '@/components/editor/EditorWrapper.vue'
import PreviewPanel from '@/components/preview/PreviewPanel.vue'
import CommandPalette from '@/components/command/CommandPalette.vue'
import RepoSelector from '@/components/github/RepoSelector.vue'
import CommitDialog from '@/components/dialogs/CommitDialog.vue'
import ShareDialog from '@/components/dialogs/ShareDialog.vue'
import SharedSessionsDialog from '@/components/dialogs/SharedSessionsDialog.vue'
import Toast from '@/components/ui/Toast.vue'
import { useMagicKeys, whenever } from '@vueuse/core'
import { githubService } from '@/services/github'
import { cachedFileSystem, kvSync } from '@/services/storage'
// import { getConnectionStatus, onConnectionStatusChange, type ConnectionStatus } from '@/services/collab'

import { useRoute } from 'vue-router'
import JoinSessionDialog from '@/components/dialogs/JoinSessionDialog.vue'

// Router
const route = useRoute()

// Persisted State (localStorage)
const repo = useStorage<string | undefined>('quartier:repo', undefined)
const currentFile = useStorage<string | null>('quartier:currentFile', null)
const showSidebar = useStorage('quartier:showSidebar', true)
const showPreview = useStorage('quartier:showPreview', false)
const editorMode = useStorage<'visual' | 'source'>('quartier:editorMode', 'visual')
const activeSession = useStorage('quartier:activeSession', null)
const isShared = computed(() => !!activeSession.value)

// Responsive breakpoints for sidebar mode
import { useBreakpoints } from '@/composables/useBreakpoints'
const { sidebarMode } = useBreakpoints()

// Auto-collapse sidebar when switching to temporary/overlay mode
watch(sidebarMode, (newMode, oldMode) => {
  if (oldMode === 'persistent' && newMode !== 'persistent') {
    showSidebar.value = false
  }
})

// Transient State (not persisted)
const fileContent = ref('')
const originalFileContent = ref('')
const fileLoading = ref(false)
const commandPaletteRef = ref()
const commitDialogRef = ref()
const toastRef = ref()
const showRepoSelector = ref(false)
const recentFiles = ref<string[]>([])
const editorWrapperRef = ref<InstanceType<typeof EditorWrapper> | null>(null)
const shareDialogRef = ref<InstanceType<typeof ShareDialog> | null>(null)
const sharedSessionsDialogRef = ref<InstanceType<typeof SharedSessionsDialog> | null>(null)
const userEmail = ref<string | undefined>(undefined)
// const connectionStatus = ref<ConnectionStatus>('disconnected')
const connectionStatus = ref<'connecting' | 'connected' | 'disconnected' | 'error'>('connected') // TODO: Wire up real status from MilkdownEditor
const autoSaveStatus = ref<'idle' | 'saving' | 'saved'>('idle')

// Computed room ID for collaboration
const collabRoomId = computed(() => {
  if (!repo.value || !currentFile.value) return undefined
  return `quartier:${repo.value}/${currentFile.value}`
})

// Full file path for sharing (owner/repo/path)
const fullFilePath = computed(() => {
  if (!repo.value || !currentFile.value) return ''
  return `${repo.value}/${currentFile.value}`
})

const sessionMemberCount = computed(() => {
  try {
    const activeSession = localStorage.getItem('quartier:activeSession')
    if (activeSession) {
      const session = JSON.parse(activeSession)
      return session.members?.length || session.memberCount || 1
    }
  } catch (e) { /* ignore */ }
  return 1
})

const allowedPaths = computed(() => {
  try {
    const activeSession = localStorage.getItem('quartier:activeSession')
    if (activeSession) {
      const session = JSON.parse(activeSession)
      return session.paths || []
    }
  } catch (e) { /* ignore */ }
  return []
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

// Track connection status for current file
// let unsubscribeConnectionStatus: (() => void) | null = null

// watch([repo, currentFile], ([newRepo, newFile]: [string | undefined, string | null]) => {
//   // Unsubscribe from previous file
//   if (unsubscribeConnectionStatus) {
//     unsubscribeConnectionStatus()
//     unsubscribeConnectionStatus = null
//   }
  
//   // Subscribe to new file if both repo and file are set
//   if (newRepo && newFile) {
//     const [owner, name] = newRepo.split('/')
//     if (owner && name) {
//       // Get initial status
//       // connectionStatus.value = getConnectionStatus(owner, name, newFile)
      
//       // Subscribe to status changes
//       /*
//       unsubscribeConnectionStatus = onConnectionStatusChange(
//         owner,
//         name,
//         newFile,
//         (status) => {
//           connectionStatus.value = status
//         }
//       )
//       */
//     }
//   } else {
//     connectionStatus.value = 'disconnected'
//   }
// })

// Restore file content on mount
onMounted(async () => {
  console.log('[AppLayout] onMounted - repo:', repo.value, 'currentFile:', currentFile.value)
  
  // Auth state allows checking if we are host or guest
  // userEmail is largely redundant if we use useAuth, but we keep it for now
  if (accessUser.value?.email) {
    userEmail.value = accessUser.value.email
    console.log('[AppLayout] User email:', userEmail.value)
  } else if (user.value?.login) {
    // If Github user, we might want their email too, but for now just log
    console.log('[AppLayout] GitHub User:', user.value.login)
  }
  
  if (repo.value && currentFile.value) {
    console.log('[AppLayout] Restoring file on mount:', currentFile.value)
    
    // Only try to load file if we have auth (Host or Access)
    if (isAuthenticated.value || isAccessAuthenticated.value) {
        await selectFile(currentFile.value)
    }
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
    
    autoSaveStatus.value = 'saving'
    console.log('[AutoSync] Saving to KV...')
    const saved = await kvSync.put(owner, name, currentFile.value, fileContent.value)
    if (saved) {
      lastSyncedContent = fileContent.value
      autoSaveStatus.value = 'saved'
      console.log('[AutoSync] Saved successfully')
      
      // Reset to idle after 2 seconds
      setTimeout(() => {
        autoSaveStatus.value = 'idle'
      }, 2000)
    } else {
      autoSaveStatus.value = 'idle'
    }
  }, 60000) // Every 60 seconds

  // Warn about unsaved changes before unload
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval)
    autoSyncInterval = null
  }
  // if (unsubscribeConnectionStatus) {
  //   unsubscribeConnectionStatus()
  //   unsubscribeConnectionStatus = null
  // }
})

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (fileContent.value !== lastSyncedContent || autoSaveStatus.value === 'saving') {
    e.preventDefault()
    e.returnValue = ''
    return ''
  }
}

function openCommandPalette() {
  commandPaletteRef.value?.open()
}

function openShareDialog() {
  shareDialogRef.value?.open()
}

function openSharedSessions(mode: 'shared-with-me' | 'shared-by-me') {
  sharedSessionsDialogRef.value?.open(mode)
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
      lastSyncedContent = kvData.content
      // Update local cache with KV content
      await cachedFileSystem.setCache(owner, name, path, kvData.content)
      fileLoading.value = false
      return
    }
    
    if (kvData) {
      console.log('[AppLayout] Loaded from KV:', path)
      fileContent.value = kvData.content
      lastSyncedContent = kvData.content
      await cachedFileSystem.setCache(owner, name, path, kvData.content)
      fileLoading.value = false
      return
    }
    
    if (localContent !== null) {
      console.log('[AppLayout] Loaded from local cache:', path)
      fileContent.value = localContent
      lastSyncedContent = localContent
      fileLoading.value = false
      return
    }
    
    // Not in KV or local cache, load from GitHub
    const content = await githubService.readFile(owner, name, path)
    
    // Cache the content locally
    await cachedFileSystem.setCache(owner, name, path, content)
    
    fileContent.value = content
    lastSyncedContent = content
    originalFileContent.value = content // Track original for diff
    console.log('File loaded from GitHub, length:', content.length)
  } catch (error) {
    console.error('Failed to load file:', error)
    fileContent.value = `# Error loading file\n\nFailed to load ${path}:\n${error instanceof Error ? error.message : 'Unknown error'}`
  } finally {
    fileLoading.value = false
  }
}

// File operation handlers
async function handleCreateFile(parentPath: string) {
  if (!repo.value) return
  const [owner, name] = repo.value.split('/')
  if (!owner || !name) return
  
  const fileName = window.prompt('Enter new file name:', 'new-file.qmd')
  if (!fileName) return
  
  const fullPath = parentPath ? `${parentPath}/${fileName}` : fileName
  const result = await githubService.createFile(owner, name, fullPath, '---\ntitle: "New Document"\n---\n\n')
  
  if (result.success) {
    // Reload and select the new file
    selectFile(fullPath)
    window.location.reload() // Refresh file tree
  } else {
    alert(`Failed to create file: ${result.error}`)
  }
}

async function handleCreateFolder(_parentPath: string) {
  // GitHub doesn't have "folders" - they're created when a file is added
  alert('To create a folder, create a new file with a path like "folder/file.qmd"')
}

async function handleRenameFile(path: string) {
  if (!repo.value) return
  const [owner, name] = repo.value.split('/')
  if (!owner || !name) return
  
  const currentName = path.split('/').pop() || path
  const newName = window.prompt('Enter new name:', currentName)
  if (!newName || newName === currentName) return
  
  const parentPath = path.split('/').slice(0, -1).join('/')
  const newPath = parentPath ? `${parentPath}/${newName}` : newName
  
  const result = await githubService.renameFile(owner, name, path, newPath)
  
  if (result.success) {
    selectFile(newPath)
    window.location.reload()
  } else {
    alert(`Failed to rename: ${result.error}`)
  }
}

async function handleDeleteFile(path: string) {
  if (!repo.value) return
  const [owner, name] = repo.value.split('/')
  if (!owner || !name) return
  
  const confirmed = window.confirm(`Delete "${path}"? This cannot be undone.`)
  if (!confirmed) return
  
  const result = await githubService.deleteFile(owner, name, path)
  
  if (result.success) {
    currentFile.value = null
    fileContent.value = ''
    window.location.reload()
  } else {
    alert(`Failed to delete: ${result.error}`)
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
    lastSyncedContent = fileContent.value
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
      if (!repo.value) {
        // Only prompt to select repo if we are Host (Github user)
        // Guests rely on session/share link to set the repo
        if (isHost.value) {
          showRepoSelector.value = true
        } else {
          console.log('[AppLayout] Guest user, waiting for session-based repo...')
        }
      }
      break
    case 'new-file':
      handleCreateFile('')
      break
    case 'rename-file':
      if (currentFile.value) handleRenameFile(currentFile.value)
      break
    case 'delete-file':
      if (currentFile.value) handleDeleteFile(currentFile.value)
      break
    default:
      console.log('[AppLayout] Unknown palette action:', action)
  }
}

function handleJoined() {
  // Redirect to app (cleans URL and loads session state)
  window.location.href = '/app'
}
</script>
