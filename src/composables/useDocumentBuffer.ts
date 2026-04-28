import { computed, onMounted, onUnmounted, reactive } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { appStateRepository } from '@/core/state/AppStateRepository'
import { toDocumentRef, type BufferState } from '@/core/workspace/types'
import { useWorkspaceSession } from './useWorkspaceSession'

const state = reactive<BufferState>({
  document: null,
  content: '',
  baseRevision: null,
  dirty: false,
  lastSavedAt: null,
  saveTarget: 'provider',
})

const metaState = reactive({
  loading: false,
  authError: false,
  status: 'idle' as 'idle' | 'saving' | 'saved',
})

let autoSaveInterval: ReturnType<typeof setInterval> | null = null

export function useDocumentBuffer() {
  const workspaceSession = useWorkspaceSession()

  const loadActiveDocument = async () => {
    const provider = workspaceSession.getProvider()
    const handle = workspaceSession.state.activeHandle
    const path = workspaceSession.state.activeDocumentPath
    const workspace = workspaceSession.state.activeWorkspace
    if (!provider || !handle || !path || !workspace) {
      state.document = null
      state.content = ''
      state.baseRevision = null
      state.dirty = false
      return
    }

    metaState.loading = true
    metaState.authError = false
    try {
      const snapshot = await provider.readDocument(handle, path)
      const draft = await appStateRepository.getDraft(workspace.providerId, workspace.workspaceId, path)
      const content = draft && draft !== snapshot.content ? draft : snapshot.content
      state.document = toDocumentRef(workspace.workspaceId, path)
      state.content = content
      state.baseRevision = snapshot.revision
      state.dirty = content !== snapshot.content
      state.lastSavedAt = null
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
      metaState.authError = message.includes('auth') || message.includes('expired') || message.includes('permission')
      if (!metaState.authError) {
        console.error('Failed to load active document:', error)
      }
    } finally {
      metaState.loading = false
    }
  }

  const setContent = (content: string) => {
    state.content = content
    state.dirty = !!state.document && content !== ''
  }

  const markSaved = async (revision: string | null) => {
    state.baseRevision = revision
    state.dirty = false
    state.lastSavedAt = Date.now()
    metaState.status = 'saved'
    const workspace = workspaceSession.state.activeWorkspace
    if (workspace && state.document) {
      await appStateRepository.clearDraft(workspace.providerId, workspace.workspaceId, state.document.path)
    }
    window.setTimeout(() => {
      if (metaState.status === 'saved') metaState.status = 'idle'
    }, 1500)
  }

  const clear = () => {
    state.document = null
    state.content = ''
    state.baseRevision = null
    state.dirty = false
    state.lastSavedAt = null
    metaState.loading = false
    metaState.authError = false
  }

  const startDraftSync = () => {
    if (autoSaveInterval) return
    autoSaveInterval = setInterval(async () => {
      const workspace = workspaceSession.state.activeWorkspace
      if (!workspace || !state.document || !state.dirty || metaState.loading) return
      metaState.status = 'saving'
      await appStateRepository.saveDraft(workspace.providerId, workspace.workspaceId, state.document.path, state.content)
      metaState.status = 'saved'
      window.setTimeout(() => {
        if (metaState.status === 'saved') metaState.status = 'idle'
      }, 1500)
    }, 5000)
  }

  const stopDraftSync = () => {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval)
      autoSaveInterval = null
    }
  }

  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!state.dirty) return
    event.preventDefault()
    event.returnValue = 'You have unsaved changes.'
  }

  onMounted(() => {
    startDraftSync()
    window.addEventListener('beforeunload', handleBeforeUnload)
  })

  onUnmounted(() => {
    stopDraftSync()
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })

  onBeforeRouteLeave(() => {
    if (!state.dirty) return true
    return window.confirm('You have unsaved changes. Are you sure you want to leave?')
  })

  return {
    state,
    meta: computed(() => metaState),
    loadActiveDocument,
    setContent,
    markSaved,
    clear,
  }
}
