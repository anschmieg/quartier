<template>
  <div class="flex flex-col h-screen bg-background text-foreground overflow-hidden">
    <!-- Header -->
    <AppHeader 
      :can-save="!!currentFile"
      :sidebar-visible="showSidebar"
      :show-right-sidebar="showRightSidebar"
      :editor-mode="editorMode"
      :get-editor="getEditorInstance"
      :can-share="!!currentFile && currentProvider.capabilities.canShare"
      :session-member-count="sessionMemberCount"
      @command-palette="openCommandPalette"
      @share="openShareDialog"
      @toggle-sidebar="showSidebar = !showSidebar"
      @update:show-right-sidebar="showRightSidebar = $event"


      @update:editor-mode="(mode) => { editorMode = mode; userPreferredMode = mode }"
      :disable-visual-mode="isCodeFile"
      :show-comments="showComments"
      @toggle-comments="showComments = !showComments"
    />

    <!-- Main Layout -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <AppSidebar 
        :visible="showSidebar"
        :mode="sidebarMode"
        :project="project"
        :repo="isGitHub ? (project || undefined) : undefined"
        :selected-file="currentFile"
        :is-dirty="isDirty"
        :is-host="isHost"
        :allowed-paths="allowedPaths"
        @open-source-selector="handleOpenSourceSelector"
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
            :class="showRightSidebar ? 'w-1/2' : 'w-full'" 
            class="h-full overflow-hidden transition-all duration-150"
          >
            <EditorWrapper 
              ref="editorWrapperRef"
              :initial-content="fileContent"
              :mode="editorMode"
              :room-id="activeSession?.roomId"
              :user-email="(user as any)?.email"
              :enable-collab="isShared"
              :filename="currentFile || undefined"
              :show-comments="showComments"
              @update:content="updateFileContent"
              @save="saveFile"
            />
          </div>

          <!-- Loading Overlay -->
          <Transition
            enter-active-class="transition-opacity duration-200"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition-opacity duration-200"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <div 
              v-if="fileLoading" 
              class="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-[1px]"
            >
              <LoadingSpinner size="lg" message="Loading file..." />
            </div>
          </Transition>
          
        </div>
      </main>

      <!-- Right Sidebar -->
      <AppRightSidebar 
        :visible="showRightSidebar"
        :can-save="!!currentFile"
        :can-share="!!currentFile && currentProvider.capabilities.canShare"
        :auto-save-status="autoSaveStatus"
        :is-dirty-to-provider="isDirtyToProvider"
        :provider-id="activeProviderId"
        :provider-name="currentProvider.name"
        :connection-status="connectionStatus"
        :file-content="fileContent"
        :repo="isGitHub ? (project ?? undefined) : undefined"
        @save="saveFile"
        @share="openShareDialog"
        @close="showRightSidebar = false"
      />
    </div>

    <!-- Modals -->
    <CommandPalette 
      ref="commandPaletteRef" 
      :files="recentFiles" 
      @select="selectFile" 
      @action="handlePaletteAction"
    />
    <RepoSelector v-model:open="showRepoSelector" @select="handleRepoSelect" />
    <LocalProjectSelector 
        v-model:open="showLocalSelector" 
        :current-project="project"
        @select="handleLocalProjectSelect" 
    />
    <CloudProjectSelector
        v-model:open="showCloudSelector"
        :provider="targetCloudProvider"
        @select="handleCloudProjectSelect"
    />
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
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const { isAuthenticated, isAccessAuthenticated, isHost, user, accessUser } = useAuth()
import { useStorage } from '@vueuse/core'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import EditorWrapper from '@/components/editor/EditorWrapper.vue'
import CommandPalette from '@/components/command/CommandPalette.vue'
import RepoSelector from '@/components/github/RepoSelector.vue'
import CommitDialog from '@/components/dialogs/CommitDialog.vue'
import ShareDialog from '@/components/dialogs/ShareDialog.vue'
import SharedSessionsDialog from '@/components/dialogs/SharedSessionsDialog.vue'
import Toast from '@/components/ui/Toast.vue'
import { useMagicKeys, whenever } from '@vueuse/core'
import { LoadingSpinner } from '@/components/ui/loading'
import { storageManager } from '@/services/storageManager'
import { storage } from '@/services/storage'

import JoinSessionDialog from '@/components/dialogs/JoinSessionDialog.vue'
import LocalProjectSelector from '@/components/layout/LocalProjectSelector.vue'
import CloudProjectSelector from '@/components/layout/CloudProjectSelector.vue'
import AppRightSidebar from '@/components/layout/AppRightSidebar.vue'

// Router
const route = useRoute()

// State
const project = ref<string | null>(storageManager.activeProject)
const activeProviderId = ref<string>(storageManager.activeProvider.id)
const currentProvider = computed(() => storageManager.activeProvider)
const isGitHub = computed(() => activeProviderId.value === 'github')

// Watch changes in storageManager
watch(() => storageManager.activeProject, (val) => {
    project.value = val
})
watch(() => storageManager.activeProvider, (val) => {
    activeProviderId.value = val.id
})

const currentFile = useStorage<string | null>('quartier:currentFile', null)
const showSidebar = useStorage('quartier:showSidebar', true)
const showRightSidebar = useStorage('quartier:showRightSidebar', false)
const editorMode = useStorage<'visual' | 'source'>('quartier:editorMode', 'visual')
// Track what the user *wants* to use (to restore after force-source mode)
const userPreferredMode = useStorage<'visual' | 'source'>('quartier:userPreferredMode', 'visual')
const showComments = useStorage('quartier:showComments', true)

const activeSession = useStorage<{ roomId: string } | null>('quartier:activeSession', null)
const isShared = computed(() => !!activeSession.value)

// Helper to check for code files
const isCodeFile = computed(() => {
  if (!currentFile.value) return false
  // List of extensions that support visual mode (Markdown/Quarto)
  const visualExtensions = ['.md', '.qmd', '.rmd', '.markdown', '.mkd']
  const ext = '.' + currentFile.value.split('.').pop()?.toLowerCase()
  return !visualExtensions.includes(ext)
})

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
const editorWrapperRef = ref()
const shareDialogRef = ref()
const sharedSessionsDialogRef = ref()
// Modals
const showRepoSelector = ref(false)
const showLocalSelector = ref(false)
const showCloudSelector = ref(false)
const targetCloudProvider = ref<any>(null)

const userEmail = ref<string | undefined>(undefined)
const recentFiles = useStorage<string[]>('quartier:recentFiles', [])
function addToRecent(path: string) {
  recentFiles.value = [path, ...recentFiles.value.filter(p => p !== path)].slice(0, 10)
}
// const connectionStatus = ref<ConnectionStatus>('disconnected')
const connectionStatus = ref<'connecting' | 'connected' | 'disconnected' | 'error'>('connected') // TODO: Wire up real status from MilkdownEditor
const autoSaveStatus = ref<'idle' | 'saving' | 'saved'>('idle')

// Dirty state tracking (Local vs UI)
let lastLocalSaveContent = ''
// Provider state tracking (Provider vs local cache)
const lastProviderContent = ref('')

const isDirtyToLocal = computed(() => {
  if (!currentFile.value) return false
  return fileContent.value !== lastLocalSaveContent
})

const isDirtyToProvider = computed(() => {
  if (!currentFile.value) return false
  return fileContent.value !== lastProviderContent.value
})

const isDirty = isDirtyToLocal // keep legacy prop for UI



// Full file path for sharing (owner/repo/path)
const fullFilePath = computed(() => {
  if (!project.value || !currentFile.value) return ''
  return `${project.value}/${currentFile.value}`
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
  console.log('[AppLayout] onMounted - project:', project.value, 'currentFile:', currentFile.value)
  
  // Auth state allows checking if we are host or guest
  // userEmail is largely redundant if we use useAuth, but we keep it for now
  if (accessUser.value?.email) {
    userEmail.value = accessUser.value.email
    console.log('[AppLayout] User email:', userEmail.value)
  } else if (user.value?.login) {
    // If Github user, we might want their email too, but for now just log
    console.log('[AppLayout] GitHub User:', user.value.login)
  }
  
  if (project.value && currentFile.value) {
    console.log('[AppLayout] Restoring file on mount:', currentFile.value)
    
    // Only try to load file if we have auth (Host or Access)
    if (isAuthenticated.value || isAccessAuthenticated.value) {
        await selectFile(currentFile.value)
    }
  } else {
    console.log('[AppLayout] No file to restore')
  }
  
  // Auto-save to Local Cache (Drafts)
  autoSyncInterval = setInterval(async () => {
    if (!project.value || !currentFile.value) return
    if (!isDirtyToLocal.value) return
    if (fileLoading.value) return
    
    autoSaveStatus.value = 'saving'
    try {
      // We use a dedicated local-drafts namespace in unstorage
      const draftKey = `draft:${activeProviderId.value}:${project.value}:${currentFile.value}`
      await storage.setItem(draftKey, fileContent.value)
      lastLocalSaveContent = fileContent.value
      autoSaveStatus.value = 'saved'
      
      setTimeout(() => {
        if (autoSaveStatus.value === 'saved') autoSaveStatus.value = 'idle'
      }, 2000)
    } catch (e) {
      console.error('[AutoDraft] Failed to save draft:', e)
      autoSaveStatus.value = 'idle'
    }
  }, 5000) // Much more frequent for drafts (5s)

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

// Internal router guard to prevent data loss
onBeforeRouteLeave(() => {
  if (isDirty.value) {
    return window.confirm('You have unsaved changes. Are you sure you want to leave?')
  }
})

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (isDirtyToProvider.value) {
    const msg = `You have unsaved changes to ${currentProvider.value.name}. Changes ARE kept in your browser sandbox, but not synced to the actual source.`
    e.preventDefault()
    // @ts-ignore
    e.returnValue = msg
    return msg
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
  if (!project.value) return
  
  try {
    fileLoading.value = true
    currentFile.value = path
    
    // 1. Initial load from provider
    const providerContent = await currentProvider.value.readFile(project.value, path)
    
    // 2. Check for local draft
    const draftKey = `draft:${activeProviderId.value}:${project.value}:${path}`
    const localDraft = await storage.getItem(draftKey) as string | null
    
    if (localDraft && localDraft !== providerContent) {
        if (confirm('A more recent local version exists. Load the draft?')) {
            fileContent.value = localDraft
        } else {
            fileContent.value = providerContent
        }
    } else {
        fileContent.value = providerContent
    }
    
    lastLocalSaveContent = fileContent.value
    lastProviderContent.value = providerContent
    originalFileContent.value = providerContent
    addToRecent(path)
  } catch (error) {
    console.error('Failed to load file:', error)
    fileContent.value = `# Error loading file\n\nFailed to load ${path}:\n${error instanceof Error ? error.message : 'Unknown error'}`
  } finally {
    fileLoading.value = false
  }
}

async function handleCreateFile(parentPath: string) {
  if (!project.value) return
  
  const fileName = window.prompt('Enter new file name:', 'new-file.qmd')
  if (!fileName) return
  
  const fullPath = parentPath ? `${parentPath}/${fileName}` : fileName
  try {
    await currentProvider.value.writeFile(project.value, fullPath, '---\ntitle: "New Document"\n---\n\n')
    selectFile(fullPath)
    window.location.reload()
  } catch (error) {
    alert(`Failed to create file: ${error}`)
  }
}

async function handleCreateFolder(_parentPath: string) {
  if (currentProvider.value.createFolder && project.value) {
    const folderName = window.prompt('Enter folder name:')
    if (folderName) {
      await currentProvider.value.createFolder(project.value, folderName)
      window.location.reload()
    }
  } else {
    alert('This storage source does not support explicit folder creation. Create a file with a path like "folder/file.md" instead.')
  }
}

async function handleRenameFile(path: string) {
  if (!project.value || !currentProvider.value.renameFile) return
  
  const currentName = path.split('/').pop() || path
  const newName = window.prompt('Enter new name:', currentName)
  if (!newName || newName === currentName) return
  
  const parentPath = path.split('/').slice(0, -1).join('/')
  const newPath = parentPath ? `${parentPath}/${newName}` : newName
  
  try {
    await currentProvider.value.renameFile(project.value, path, newPath)
    selectFile(newPath)
    window.location.reload()
  } catch (error) {
    alert(`Failed to rename: ${error}`)
  }
}

async function handleDeleteFile(path: string) {
  if (!project.value) return
  
  const confirmed = window.confirm(`Delete "${path}"? This cannot be undone.`)
  if (!confirmed) return
  
  try {
    await currentProvider.value.deleteFile(project.value, path)
    currentFile.value = null
    fileContent.value = ''
    window.location.reload()
  } catch (error) {
    alert(`Failed to delete: ${error}`)
  }
}

async function updateFileContent(newContent: string) {
  fileContent.value = newContent
}

async function saveFile() {
  if (!currentFile.value || !project.value) return
  
  if (currentProvider.value.capabilities.canCommit) {
    commitDialogRef.value?.open()
  } else {
    // Direct save for local/disk providers
    try {
      await currentProvider.value.writeFile(project.value, currentFile.value, fileContent.value)
      lastProviderContent.value = fileContent.value
      toastRef.value?.success(`File saved to ${currentProvider.value.name}`)
    } catch (error) {
       toastRef.value?.error(`Failed to save: ${error}`)
    }
  }
}

async function handleCommit(message: string) {
  if (!currentFile.value || !project.value) return
  
  try {
    // Use githubService directly or provider
    await currentProvider.value.writeFile(project.value, currentFile.value, fileContent.value, message)
    lastProviderContent.value = fileContent.value
    toastRef.value?.success('Committed successfully')
  } catch (error) {
    toastRef.value?.error(`Commit failed: ${error}`)
  }
}

function handleRepoSelect(selectedRepo: { full_name: string }) {
  storageManager.setSource('github', selectedRepo.full_name)
  currentFile.value = null
  fileContent.value = ''
}

function handleOpenSourceSelector(providerId: string) {
  if (providerId === 'github') {
    showRepoSelector.value = true
  } else if (providerId === 'local') {
    showLocalSelector.value = true
    return
  }

  // Handle Cloud Providers (Google Drive, Nextcloud)
  if (providerId === 'gdrive' || providerId === 'nextcloud') {
    const provider = storageManager.allProviders.find(p => p.id === providerId)
    if (provider) {
        targetCloudProvider.value = provider
        showCloudSelector.value = true
    }
    return
  }
}

async function handleLocalProjectSelect(projectId: string) {
    if (projectId) {
        storageManager.setSource('local', projectId)
        // Force refresh
        project.value = projectId
        activeProviderId.value = 'local'
        currentFile.value = null
        fileContent.value = ''
        await currentProvider.value.listFiles(projectId)
    }
    showLocalSelector.value = false
}

async function handleCloudProjectSelect(projectId: string) {
    if (projectId && targetCloudProvider.value) {
        storageManager.setSource(targetCloudProvider.value.id, projectId)
        // Force refresh
        project.value = projectId
        activeProviderId.value = targetCloudProvider.value.id
        currentFile.value = null
        fileContent.value = ''
        targetCloudProvider.value = null
    }
    showCloudSelector.value = false
}

function handlePaletteAction(action: string) {
  switch (action) {
    case 'save':
      saveFile()
      break
    case 'toggle-sidebar':
      showSidebar.value = !showSidebar.value
      break
    case 'toggle-right-sidebar':
      showRightSidebar.value = !showRightSidebar.value
      break
    case 'toggle-mode':
      const newMode = editorMode.value === 'visual' ? 'source' : 'visual'
      editorMode.value = newMode
      userPreferredMode.value = newMode
      break
    case 'manage-source':
      if (isHost.value) handleOpenSourceSelector(activeProviderId.value); break
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
