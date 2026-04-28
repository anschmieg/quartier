import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { historyService } from '@/services/history'
import { useWorkspaceSession } from './useWorkspaceSession'
import type { WorkspaceRef } from '@/core/workspace/types'

export function useWorkspaceNavigation() {
  const router = useRouter()
  const workspaceSession = useWorkspaceSession()

  const openWorkspace = async (workspace: WorkspaceRef) => {
    await workspaceSession.openWorkspace(workspace)
    await router.push('/app')
  }

  const openRecentProject = async (providerId: string, workspaceId: string, displayName: string) => {
    await openWorkspace({ providerId, workspaceId, displayName })
  }

  const selectDocument = async (path: string) => {
    await workspaceSession.setActiveDocumentPath(path)
  }

  const createEntry = async (path: string, type: 'file' | 'folder', content = '', message?: string) => {
    const provider = workspaceSession.getProvider()
    const handle = workspaceSession.state.activeHandle
    if (!provider || !handle) throw new Error('No active workspace')
    await provider.createEntry(handle, { path, type, content, message })
  }

  const renameEntry = async (from: string, to: string) => {
    const provider = workspaceSession.getProvider()
    const handle = workspaceSession.state.activeHandle
    if (!provider || !handle) throw new Error('No active workspace')
    await provider.renameEntry(handle, from, to)
  }

  const deleteEntry = async (path: string) => {
    const provider = workspaceSession.getProvider()
    const handle = workspaceSession.state.activeHandle
    if (!provider || !handle) throw new Error('No active workspace')
    await provider.deleteEntry(handle, path)
  }

  return {
    currentWorkspace: computed(() => workspaceSession.state.activeWorkspace),
    recentProjects: computed(() => historyService.getProjects()),
    openWorkspace,
    openRecentProject,
    selectDocument,
    createEntry,
    renameEntry,
    deleteEntry,
  }
}
