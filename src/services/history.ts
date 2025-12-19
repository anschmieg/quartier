import { useStorage } from '@vueuse/core'

export interface RecentProject {
  id: string // composite: providerId:projectId
  providerId: string
  projectId: string
  name: string
  lastAccessed: number
  path?: string // context specific (e.g. file path)
}

class ProjectHistoryService {
  // Persist to localStorage
  private recentProjects = useStorage<RecentProject[]>('quartier:project-history', [])

  /**
   * Add or update a project in the history
   */
  addProject(providerId: string, projectId: string, name?: string) {
    const id = `${providerId}:${projectId}`
    const now = Date.now()
    
    // Find existing
    const existingIndex = this.recentProjects.value.findIndex(p => p.id === id)
    
    // Default name if not provided
    const projectName = name || projectId.split('/').pop() || projectId
    
    if (existingIndex >= 0) {
      // Move to top and update timestamp
      const existing = this.recentProjects.value[existingIndex]
      if (!existing) return // Should not happen given existingIndex check
      
      this.recentProjects.value.splice(existingIndex, 1)
      this.recentProjects.value.unshift({
        id: existing.id,
        providerId: existing.providerId,
        projectId: existing.projectId,
        path: existing.path,
        name: projectName,
        lastAccessed: now
      })
    } else {
      // Add new
      this.recentProjects.value.unshift({
        id,
        providerId,
        projectId,
        name: projectName,
        lastAccessed: now
      })
    }
    
    // Limit to 20 items
    if (this.recentProjects.value.length > 20) {
      this.recentProjects.value = this.recentProjects.value.slice(0, 20)
    }
  }

  getProjects(): RecentProject[] {
    return this.recentProjects.value
  }

  clear() {
    this.recentProjects.value = []
  }
}

export const historyService = new ProjectHistoryService()
