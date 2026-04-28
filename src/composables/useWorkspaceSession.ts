import { computed, reactive, readonly } from 'vue'
import { appStateRepository, type PersistedAppState } from '@/core/state/AppStateRepository'
import { workspaceProviderRegistry } from '@/core/workspace/providerRegistry'
import type {
  AuthContext,
  ConnectionState,
  ProviderCapabilities,
  SessionBootstrapResult,
  SessionRef,
  WorkspaceHandle,
  WorkspaceRef,
} from '@/core/workspace/types'
import { initializeAuthContext, useAuthContextState } from '@/services/authContext'
import { historyService } from '@/services/history'

interface WorkspaceSessionState {
  initialized: boolean
  activeWorkspace: WorkspaceRef | null
  activeHandle: WorkspaceHandle | null
  activeDocumentPath: string | null
  activeSession: SessionRef | null
  connectionState: ConnectionState
  providerCapabilities: ProviderCapabilities | null
  ui: PersistedAppState['ui']
}

const state = reactive<WorkspaceSessionState>({
  initialized: false,
  activeWorkspace: null,
  activeHandle: null,
  activeDocumentPath: null,
  activeSession: null,
  connectionState: {
    transport: 'none',
    status: 'idle',
    lastError: null,
  },
  providerCapabilities: null,
  ui: {
    showSidebar: true,
    showRightSidebar: false,
    editorMode: 'visual',
    userPreferredMode: 'visual',
    showComments: true,
    expandedFolders: {},
    recentFiles: [],
  },
})

let initializePromise: Promise<void> | null = null

async function persist() {
  await appStateRepository.save({
    activeWorkspace: state.activeWorkspace,
    activeDocumentPath: state.activeDocumentPath,
    activeSession: state.activeSession,
    recentWorkspaces: (await appStateRepository.load()).recentWorkspaces,
    ui: state.ui,
  })
}

async function rebuildHandle() {
  if (!state.activeWorkspace) {
    state.activeHandle = null
    state.providerCapabilities = null
    return
  }

  const provider = workspaceProviderRegistry.get(state.activeWorkspace.providerId)
  if (!provider) throw new Error(`Unknown provider: ${state.activeWorkspace.providerId}`)
  const handle = await provider.openWorkspace(state.activeWorkspace, {
    sessionId: state.activeSession?.sessionId,
  })
  state.activeHandle = handle
  state.providerCapabilities = provider.getCapabilities(handle)
}

export function useWorkspaceSession() {
  const authState = useAuthContextState()

  const initialize = async () => {
    if (initializePromise) return initializePromise
    initializePromise = (async () => {
      const persisted = await appStateRepository.load()
      state.activeWorkspace = persisted.activeWorkspace
      state.activeDocumentPath = persisted.activeDocumentPath
      state.activeSession = persisted.activeSession
      state.ui = persisted.ui
      await historyService.initialize()
      await initializeAuthContext()
      await rebuildHandle().catch((error) => {
        console.error('Failed to rebuild workspace handle:', error)
        state.activeWorkspace = null
        state.activeHandle = null
      })
      state.initialized = true
    })()
    try {
      await initializePromise
    } finally {
      initializePromise = null
    }
  }

  const openWorkspace = async (workspace: WorkspaceRef, options?: { session?: SessionRef | null; documentPath?: string | null }) => {
    state.activeWorkspace = workspace
    state.activeSession = options?.session ?? null
    state.activeDocumentPath = options?.documentPath ?? null
    await rebuildHandle()
    await historyService.addProject(workspace.providerId, workspace.workspaceId, workspace.displayName)
    await persist()
  }

  const setActiveDocumentPath = async (path: string | null) => {
    state.activeDocumentPath = path
    if (path) {
      state.ui.recentFiles = [path, ...state.ui.recentFiles.filter((item) => item !== path)].slice(0, 10)
    }
    await persist()
  }

  const setSession = async (session: SessionRef | null) => {
    state.activeSession = session
    await rebuildHandle()
    await persist()
  }

  const updateUiState = async (patch: Partial<PersistedAppState['ui']>) => {
    state.ui = {
      ...state.ui,
      ...patch,
    }
    await persist()
  }

  const setConnectionState = (patch: Partial<ConnectionState>) => {
    state.connectionState = {
      ...state.connectionState,
      ...patch,
    }
  }

  const clearWorkspace = async () => {
    state.activeWorkspace = null
    state.activeHandle = null
    state.activeDocumentPath = null
    state.activeSession = null
    state.providerCapabilities = null
    await persist()
  }

  const bootstrapSession = async (result: SessionBootstrapResult) => {
    if (result.workspace) {
      await openWorkspace(result.workspace, {
        session: result.session,
        documentPath: result.initialDocumentPath,
      })
      return
    }
    await setSession(result.session)
  }

  return {
    state: readonly(state),
    auth: computed(() => authState as AuthContext),
    providers: workspaceProviderRegistry.list(),
    initialize,
    openWorkspace,
    setActiveDocumentPath,
    setSession,
    updateUiState,
    setConnectionState,
    clearWorkspace,
    bootstrapSession,
    getProvider: () => state.activeWorkspace ? workspaceProviderRegistry.get(state.activeWorkspace.providerId) || null : null,
  }
}
