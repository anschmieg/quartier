import { beforeEach, describe, expect, it } from 'vitest'
import { appStateRepository } from '@/core/state/AppStateRepository'
import { useDocumentBuffer } from '@/composables/useDocumentBuffer'
import { useWorkspaceSession } from '@/composables/useWorkspaceSession'
import { workspaceProviderRegistry } from '@/core/workspace/providerRegistry'
import type { ProviderAuthState, ProviderCapabilities, WorkspaceHandle, WorkspaceProvider, WorkspaceRef, WorkspaceSummary } from '@/core/workspace/types'

const provider: WorkspaceProvider = {
  id: 'buffer-provider',
  name: 'Buffer Provider',
  icon: 'file',
  async listWorkspaces(): Promise<WorkspaceSummary[]> {
    return [{ providerId: 'buffer-provider', workspaceId: 'workspace', displayName: 'Workspace' }]
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
  async readDocument() { return { content: '# Provider Version', revision: 'rev-1' } },
  async writeDocument() { return { revision: 'rev-2', savedAt: Date.now() } },
  async deleteEntry() {},
  async renameEntry() {},
  async createEntry(input) { return { path: input.path } },
  async getAuthState(): Promise<ProviderAuthState> { return { status: 'authenticated', user: { label: 'buffer' } } },
}

describe('useDocumentBuffer', () => {
  beforeEach(async () => {
    workspaceProviderRegistry.register(provider)
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

  it('prefers a local draft over the provider snapshot when loading a document', async () => {
    const session = useWorkspaceSession()
    await session.initialize()
    await session.openWorkspace({
      providerId: 'buffer-provider',
      workspaceId: 'workspace',
      displayName: 'Workspace',
    })
    await session.setActiveDocumentPath('notes.qmd')
    await appStateRepository.saveDraft('buffer-provider', 'workspace', 'notes.qmd', '# Draft Version')

    const buffer = useDocumentBuffer()
    await buffer.loadActiveDocument()

    expect(buffer.state.content).toBe('# Draft Version')
    expect(buffer.state.document?.path).toBe('notes.qmd')
  })
})
