<template>
  <div class="flex flex-col h-screen bg-background text-foreground overflow-hidden">
    <!-- Header -->
    <AppHeader 
      :can-save="!!currentFile"
      :sidebar-visible="showSidebar"
      :show-right-sidebar="showRightSidebar"
      :editor-mode="editorMode"
      :get-editor="getEditorInstance"
      :can-share="buildFeatures.collaboration && !!currentFile && !!workspaceSession.state.providerCapabilities?.supportsShare"
      :session-member-count="sessionMemberCount"
      :source-editor-available="buildFeatures.sourceEditor"
      :visual-editor-available="buildFeatures.visualEditor"
      @command-palette="openCommandPalette"
      @share="openShareDialog"
      @toggle-sidebar="showSidebar = !showSidebar"
      @update:show-right-sidebar="showRightSidebar = $event"


      @update:editor-mode="(mode) => { editorMode = mode; userPreferredMode = mode }"
      :disable-visual-mode="isCodeFile"
      :show-comments="buildFeatures.collaboration && showComments"
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
        :allowed-paths="[...allowedPaths]"
        :collaboration-available="buildFeatures.collaboration"
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
            class="w-full h-full overflow-hidden transition-all duration-150"
          >
            <EditorWrapper 
              ref="editorWrapperRef"
              :initial-content="fileContent"
              :mode="editorMode"
              :room-id="activeSession?.roomId"
              :user-email="accessUser?.email || user?.login"
              :enable-collab="buildFeatures.collaboration && isShared"
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

          <!-- Auth Error Overlay -->
          <Transition
            enter-active-class="transition-opacity duration-200"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition-opacity duration-200"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <div 
              v-if="authError" 
              class="absolute inset-0 z-40 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm p-4 text-center space-y-4"
            >
              <div class="bg-card border shadow-sm rounded-lg p-6 max-w-sm w-full space-y-4">
                 <div class="space-y-2">
                    <h3 class="text-lg font-semibold">Authentication Required</h3>
                    <p class="text-sm text-muted-foreground">
                        Your session with {{ currentProvider.name }} has expired or is invalid.
                    </p>
                 </div>
                 <Button @click="handleReauth" class="w-full">
                    Log In to {{ currentProvider.name }}
                 </Button>
              </div>
            </div>
          </Transition>
          
        </div>
      </main>

      <!-- Right Sidebar -->
      <AppRightSidebar 
        :visible="showRightSidebar"
        :can-save="!!currentFile"
        :can-share="buildFeatures.collaboration && !!currentFile && !!workspaceSession.state.providerCapabilities?.supportsShare"
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
      :files="[...recentFiles]" 
      @select="selectFile" 
      @action="handlePaletteAction"
    />
    <RepoSelector v-if="buildFeatures.remoteStorage" v-model:open="showRepoSelector" @select="handleRepoSelect" />
    <LocalProjectSelector 
        v-model:open="showLocalSelector" 
        :current-project="project"
        @select="handleLocalProjectSelect" 
    />
    <CloudProjectSelector
        v-if="buildFeatures.remoteStorage"
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
      v-if="buildFeatures.collaboration"
      ref="shareDialogRef"
      :file-path="fullFilePath"
    />
    <SharedSessionsDialog v-if="buildFeatures.collaboration" ref="sharedSessionsDialogRef" />
    <JoinSessionDialog v-if="buildFeatures.collaboration && route.name === 'share'" @joined="handleJoined" />
    <Toast ref="toastRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
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
import JoinSessionDialog from '@/components/dialogs/JoinSessionDialog.vue'
import LocalProjectSelector from '@/components/layout/LocalProjectSelector.vue'
import CloudProjectSelector from '@/components/layout/CloudProjectSelector.vue'
import AppRightSidebar from '@/components/layout/AppRightSidebar.vue'
import { Button } from '@/components/ui/button'
import { useWorkspaceSession } from '@/composables/useWorkspaceSession'
import { useWorkspaceNavigation } from '@/composables/useWorkspaceNavigation'
import { useDocumentBuffer } from '@/composables/useDocumentBuffer'
import { useDocumentSave } from '@/composables/useDocumentSave'
import { workspaceProviderRegistry } from '@/core/workspace/providerRegistry'
import { buildFeatures } from 'virtual:quartier-features'
import { resolveEditorMode } from '@/config/buildFeatures'

// Router
const route = useRoute()
const router = useRouter()
const { isAuthenticated, isAccessAuthenticated, isHost, user, accessUser } = useAuth()
const workspaceSession = useWorkspaceSession()
const workspaceNavigation = useWorkspaceNavigation()
const documentBuffer = useDocumentBuffer()
const documentSave = useDocumentSave()
const nullProvider = { id: '', name: 'Source', icon: 'cloud' } as any

const project = computed(() => workspaceSession.state.activeWorkspace?.displayName ?? null)
const activeProviderId = computed(() => workspaceSession.state.activeWorkspace?.providerId || '')
const currentProvider = computed(() => workspaceSession.getProvider() || nullProvider)
const isGitHub = computed(() => activeProviderId.value === 'github')
const currentFile = computed(() => workspaceSession.state.activeDocumentPath)
const showSidebar = computed({
  get: () => workspaceSession.state.ui.showSidebar,
  set: (value: boolean) => {
    workspaceSession.updateUiState({ showSidebar: value })
  }
})
const showRightSidebar = computed({
  get: () => workspaceSession.state.ui.showRightSidebar,
  set: (value: boolean) => {
    workspaceSession.updateUiState({ showRightSidebar: value })
  }
})
const editorMode = computed<'visual' | 'source'>({
  get: () => resolveEditorMode(workspaceSession.state.ui.editorMode, buildFeatures),
  set: (value) => {
    workspaceSession.updateUiState({ editorMode: value })
  }
})
const userPreferredMode = computed<'visual' | 'source'>({
  get: () => workspaceSession.state.ui.userPreferredMode,
  set: (value) => {
    workspaceSession.updateUiState({ userPreferredMode: value })
  }
})
const showComments = computed({
  get: () => workspaceSession.state.ui.showComments,
  set: (value: boolean) => {
    workspaceSession.updateUiState({ showComments: value })
  }
})

const activeSession = computed(() => workspaceSession.state.activeSession)
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
const originalFileContent = ref('')
const fileContent = computed(() => documentBuffer.state.content)
const fileLoading = computed(() => documentBuffer.meta.value.loading)
const authError = computed(() => documentBuffer.meta.value.authError)
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

const recentFiles = computed(() => workspaceSession.state.ui.recentFiles)
const connectionStatus = computed<'connecting' | 'connected' | 'disconnected' | 'error'>(() => {
  switch (workspaceSession.state.connectionState.status) {
    case 'connected':
      return 'connected'
    case 'failed':
      return 'error'
    case 'disconnected':
    case 'idle':
      return 'disconnected'
    default:
      return 'connecting'
  }
})
const autoSaveStatus = computed(() => documentBuffer.meta.value.status)
const isDirtyToProvider = computed(() => documentBuffer.state.dirty)
const isDirty = isDirtyToProvider



// Full file path for sharing (owner/repo/path)
const fullFilePath = computed(() => {
  if (!project.value || !currentFile.value) return ''
  return `${project.value}/${currentFile.value}`
})

const sessionMemberCount = computed(() => {
  return activeSession.value?.members.length || 1
})

const allowedPaths = computed(() => {
  return activeSession.value?.allowedPaths || []
})

// Getter for the editor instance (passed down to toolbar)
// This must be a function so the toolbar can call it lazily
const getEditorInstance = () => {
  // EditorWrapper exposes getMilkdownEditor
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore accessing exposed method
  return editorWrapperRef.value?.getMilkdownEditor?.() ?? undefined
}

// Keyboard shortcuts
const { Meta_K, Ctrl_K } = useMagicKeys()
whenever(() => Meta_K?.value || Ctrl_K?.value, () => openCommandPalette())

// Restore file content on mount
onMounted(async () => {
  await workspaceSession.initialize()
  if (currentFile.value && (isAuthenticated.value || isAccessAuthenticated.value)) {
    await documentBuffer.loadActiveDocument()
    originalFileContent.value = documentBuffer.state.content
  }
})

watch(
  () => [workspaceSession.state.activeHandle, workspaceSession.state.activeDocumentPath] as const,
  async ([handle, path]) => {
    if (!handle || !path) {
      documentBuffer.clear()
      originalFileContent.value = ''
      return
    }
    await documentBuffer.loadActiveDocument()
    originalFileContent.value = documentBuffer.state.content
  },
  { immediate: true }
)

watch(currentFile, (path) => {
  if (path && isCodeFile.value && editorMode.value === 'visual') {
    editorMode.value = 'source'
    return
  }
  if (path && !isCodeFile.value && editorMode.value === 'source' && userPreferredMode.value === 'visual') {
    editorMode.value = 'visual'
  }
})

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
  await workspaceNavigation.selectDocument(path)
  await documentBuffer.loadActiveDocument()
  originalFileContent.value = documentBuffer.state.content
}

async function handleReauth() {
    try {
        if (currentProvider.value?.login) {
            await currentProvider.value.login()
            // Retry file load
            if (currentFile.value) {
                await selectFile(currentFile.value)
            }
        }
    } catch (e) {
        toastRef.value?.error(`Login failed: ${e}`)
    }
}

async function handleCreateFile(parentPath: string) {
  if (!workspaceSession.state.activeWorkspace) return
  
  const fileName = window.prompt('Enter new file name:', 'new-file.qmd')
  if (!fileName) return
  
  const fullPath = parentPath ? `${parentPath}/${fileName}` : fileName
  try {
    await workspaceNavigation.createEntry(fullPath, 'file', '---\ntitle: "New Document"\n---\n\n')
    await selectFile(fullPath)
  } catch (error) {
    alert(`Failed to create file: ${error}`)
  }
}

async function handleCreateFolder(_parentPath: string) {
  if (currentProvider.value && workspaceSession.state.activeHandle && workspaceSession.state.providerCapabilities?.supportsFolders) {
    const folderName = window.prompt('Enter folder name:')
    if (folderName) {
      await workspaceNavigation.createEntry(folderName, 'folder')
    }
  } else {
    alert('This storage source does not support explicit folder creation. Create a file with a path like "folder/file.md" instead.')
  }
}

async function handleRenameFile(path: string) {
  if (!workspaceSession.state.activeWorkspace || !workspaceSession.state.providerCapabilities?.supportsRename) return
  
  const currentName = path.split('/').pop() || path
  const newName = window.prompt('Enter new name:', currentName)
  if (!newName || newName === currentName) return
  
  const parentPath = path.split('/').slice(0, -1).join('/')
  const newPath = parentPath ? `${parentPath}/${newName}` : newName
  
  try {
    await workspaceNavigation.renameEntry(path, newPath)
    if (currentFile.value === path) {
      await selectFile(newPath)
    }
  } catch (error) {
    alert(`Failed to rename: ${error}`)
  }
}

async function handleDeleteFile(path: string) {
  if (!workspaceSession.state.activeWorkspace) return
  
  const confirmed = window.confirm(`Delete "${path}"? This cannot be undone.`)
  if (!confirmed) return
  
  try {
    await workspaceNavigation.deleteEntry(path)
    if (currentFile.value === path) {
      await workspaceSession.setActiveDocumentPath(null)
      documentBuffer.clear()
    }
  } catch (error) {
    alert(`Failed to delete: ${error}`)
  }
}

async function updateFileContent(newContent: string) {
  documentBuffer.setContent(newContent)
}

async function saveFile() {
  if (!currentFile.value || !workspaceSession.state.activeWorkspace) return
  
  if (workspaceSession.state.providerCapabilities?.supportsCommit) {
    commitDialogRef.value?.open()
  } else {
    const result = await documentSave.save()
    if (result) {
      originalFileContent.value = documentBuffer.state.content
      toastRef.value?.success(`File saved to ${currentProvider.value?.name || 'provider'}`)
    } else {
      toastRef.value?.error(documentSave.error.value || 'Failed to save')
    }
  }
}

async function handleCommit(message: string) {
  if (!currentFile.value || !workspaceSession.state.activeWorkspace) return

  const result = await documentSave.save(message)
  if (result) {
    originalFileContent.value = documentBuffer.state.content
    toastRef.value?.success('Committed successfully')
  } else {
    toastRef.value?.error(documentSave.error.value || 'Commit failed')
  }
}

function handleRepoSelect(selectedRepo: { full_name: string }) {
  workspaceNavigation.openWorkspace({
    providerId: 'github',
    workspaceId: selectedRepo.full_name,
    displayName: selectedRepo.full_name,
  })
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
    const provider = workspaceProviderRegistry.get(providerId)
    if (provider) {
        targetCloudProvider.value = provider
        showCloudSelector.value = true
    }
    return
  }
}

async function handleLocalProjectSelect(projectId: string) {
    if (projectId) {
        await workspaceNavigation.openWorkspace({
          providerId: 'local',
          workspaceId: projectId,
          displayName: projectId.split(':').pop() || projectId,
        })
    }
    showLocalSelector.value = false
}

async function handleCloudProjectSelect(projectId: string) {
    if (projectId && targetCloudProvider.value) {
        await workspaceNavigation.openWorkspace({
          providerId: targetCloudProvider.value.id,
          workspaceId: projectId,
          displayName: projectId === 'root' ? targetCloudProvider.value.name : projectId,
        })
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
    case 'toggle-mode': {
      const newMode = editorMode.value === 'visual' ? 'source' : 'visual'
      const availableMode = resolveEditorMode(newMode, buildFeatures)
      editorMode.value = availableMode
      userPreferredMode.value = availableMode
      break
    }
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
  router.push('/app')
}
</script>
