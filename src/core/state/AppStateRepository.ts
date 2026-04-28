import { createStorage } from 'unstorage'
import localStorageDriver from 'unstorage/drivers/localstorage'
import type { SessionRef, WorkspaceRef } from '@/core/workspace/types'

export interface RecentWorkspace {
  providerId: string
  workspaceId: string
  displayName: string
  lastAccessed: number
}

export interface PersistedUiState {
  showSidebar: boolean
  showRightSidebar: boolean
  editorMode: 'visual' | 'source'
  userPreferredMode: 'visual' | 'source'
  showComments: boolean
  expandedFolders: Record<string, string[]>
  recentFiles: string[]
}

export interface PersistedAppState {
  activeWorkspace: WorkspaceRef | null
  activeDocumentPath: string | null
  activeSession: SessionRef | null
  recentWorkspaces: RecentWorkspace[]
  ui: PersistedUiState
}

const storage = createStorage({
  driver: localStorageDriver({ base: 'quartier:v2:' }),
})

const APP_STATE_KEY = 'app-state'
const DRAFT_PREFIX = 'draft:'
const CRED_PREFIX = 'credential:'

const defaultState = (): PersistedAppState => ({
  activeWorkspace: null,
  activeDocumentPath: null,
  activeSession: null,
  recentWorkspaces: [],
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

export class AppStateRepository {
  async load(): Promise<PersistedAppState> {
    const raw = await storage.getItem(APP_STATE_KEY)
    if (!raw || typeof raw !== 'object') return defaultState()
    return {
      ...defaultState(),
      ...(raw as PersistedAppState),
      ui: {
        ...defaultState().ui,
        ...((raw as PersistedAppState).ui || {}),
      },
    }
  }

  async save(state: PersistedAppState): Promise<void> {
    await storage.setItem(APP_STATE_KEY, state)
  }

  async patch(patch: Partial<PersistedAppState>): Promise<PersistedAppState> {
    const current = await this.load()
    const next: PersistedAppState = {
      ...current,
      ...patch,
      ui: {
        ...current.ui,
        ...(patch.ui || {}),
      },
    }
    await this.save(next)
    return next
  }

  async getDraftKey(providerId: string, workspaceId: string, path: string): Promise<string> {
    return `${DRAFT_PREFIX}${providerId}:${workspaceId}:${path}`
  }

  async getDraft(providerId: string, workspaceId: string, path: string): Promise<string | null> {
    const key = await this.getDraftKey(providerId, workspaceId, path)
    const raw = await storage.getItem(key)
    return typeof raw === 'string' ? raw : raw == null ? null : String(raw)
  }

  async saveDraft(providerId: string, workspaceId: string, path: string, content: string): Promise<void> {
    const key = await this.getDraftKey(providerId, workspaceId, path)
    await storage.setItem(key, content)
  }

  async clearDraft(providerId: string, workspaceId: string, path: string): Promise<void> {
    const key = await this.getDraftKey(providerId, workspaceId, path)
    await storage.removeItem(key)
  }

  async getCredential<T>(scope: string): Promise<T | null> {
    const raw = await storage.getItem(`${CRED_PREFIX}${scope}`)
    return (raw as T | null) ?? null
  }

  async setCredential(scope: string, value: unknown): Promise<void> {
    await storage.setItem(`${CRED_PREFIX}${scope}`, value)
  }

  async clearCredential(scope: string): Promise<void> {
    await storage.removeItem(`${CRED_PREFIX}${scope}`)
  }
}

export const appStateRepository = new AppStateRepository()
