import { beforeEach, describe, expect, it } from 'vitest'
import { workspaceProviderRegistry } from '@/core/workspace/providerRegistry'
import { useWorkspaceSession } from '@/composables/useWorkspaceSession'
import { appStateRepository } from '@/core/state/AppStateRepository'
import type { ProviderAuthState, ProviderCapabilities, WorkspaceHandle, WorkspaceProvider, WorkspaceRef, WorkspaceSummary } from '@/core/workspace/types'

const testProvider: WorkspaceProvider = {
  id: 'test-provider',
  name: 'Test Provider',
  icon: 'flask',
  async listWorkspaces(): Promise<WorkspaceSummary[]> {
    return [{ providerId: 'test-provider', workspaceId: 'demo', displayName: 'Demo' }]
  },
  async openWorkspace(ref: WorkspaceRef): Promise<WorkspaceHandle> {
    return { ...ref }
  },
  getCapabilities(): ProviderCapabilities {
    return {
      supportsCommit: false,
      supportsRealtime: false,
      supportsShare: false,
      supportsRename: true,
      supportsFolders: true,
      supportsBinaryRead: true,
      supportsExecution: false,
      supportsLanguageService: true,
    }
  },
  async listEntries() { return [] },
  async readDocument() { return { content: '# Demo', revision: 'rev-1' } },
  async writeDocument() { return { revision: 'rev-2', savedAt: Date.now() } },
  async deleteEntry() {},
  async renameEntry() {},
  async createEntry(_handle, input) { return { path: input.path } },
  async getAuthState(): Promise<ProviderAuthState> { return { status: 'authenticated', user: { label: 'tester' } } },
}

describe('useWorkspaceSession', () => {
  beforeEach(async () => {
    workspaceProviderRegistry.register(testProvider)
    await appStateRepository.save({
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
  })

  it('opens a workspace and persists it as the single active workspace', async () => {
    const session = useWorkspaceSession()
    await session.initialize()

    await session.openWorkspace({
      providerId: 'test-provider',
      workspaceId: 'demo',
      displayName: 'Demo',
    })

    expect(session.state.activeWorkspace?.workspaceId).toBe('demo')
    expect(session.state.activeHandle?.workspaceId).toBe('demo')
    expect(session.state.providerCapabilities?.supportsRename).toBe(true)

    const persisted = await appStateRepository.load()
    expect(persisted.activeWorkspace?.workspaceId).toBe('demo')
  })
})
