import { ref } from 'vue'
import { appStateRepository, type RecentWorkspace } from '@/core/state/AppStateRepository'

export interface RecentProject {
  id: string
  providerId: string
  projectId: string
  name: string
  lastAccessed: number
  path?: string
}

class ProjectHistoryService {
  private recentProjects = ref<RecentProject[]>([])
  private initialized = false

  async initialize() {
    if (this.initialized) return
    const state = await appStateRepository.load()
    this.recentProjects.value = state.recentWorkspaces.map(this.fromRecentWorkspace)
    this.initialized = true
  }

  async addProject(providerId: string, projectId: string, name?: string) {
    await this.initialize()
    const projectName = name || projectId.split('/').pop() || projectId
    const id = `${providerId}:${projectId}`
    const now = Date.now()

    const next = [
      { id, providerId, projectId, name: projectName, lastAccessed: now },
      ...this.recentProjects.value.filter((project) => project.id !== id),
    ].slice(0, 20)

    this.recentProjects.value = next
    await appStateRepository.patch({
      recentWorkspaces: next.map((project) => ({
        providerId: project.providerId,
        workspaceId: project.projectId,
        displayName: project.name,
        lastAccessed: project.lastAccessed,
      })),
    })
  }

  getProjects(): RecentProject[] {
    return this.recentProjects.value
  }

  async clear() {
    this.recentProjects.value = []
    await appStateRepository.patch({ recentWorkspaces: [] })
  }

  private fromRecentWorkspace(workspace: RecentWorkspace): RecentProject {
    return {
      id: `${workspace.providerId}:${workspace.workspaceId}`,
      providerId: workspace.providerId,
      projectId: workspace.workspaceId,
      name: workspace.displayName,
      lastAccessed: workspace.lastAccessed,
    }
  }
}

export const historyService = new ProjectHistoryService()
