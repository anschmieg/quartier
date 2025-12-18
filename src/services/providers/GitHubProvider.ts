import type { StorageProvider, ProviderCapabilities } from '../../types/providers'
import type { FileItem } from '../../types/files'
import { githubService } from '../github'

export class GitHubProvider implements StorageProvider {
  id = 'github'
  name = 'GitHub'
  icon = 'github'
  capabilities: ProviderCapabilities = {
    canCommit: true,
    canShare: true,
    canDelete: true,
    canRename: true,
    isOffline: false,
    hasSessions: true
  }

  async listProjects() {
    return await githubService.listRepos()
  }

  async listFiles(project: string, path: string = ''): Promise<FileItem[]> {
    const parts = project.split('/')
    const owner = parts[0]
    const repo = parts[1]
    
    if (!owner || !repo) return []
    
    const data = await githubService.loadRepo(owner, repo, path)
    
    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        path: item.path,
        type: item.type === 'dir' ? 'dir' : 'file'
      }))
    }
    
    return []
  }

  async readFile(project: string, path: string): Promise<string> {
    const parts = project.split('/')
    const owner = parts[0]
    const repo = parts[1]
    if (!owner || !repo) throw new Error('Invalid project identifier')
    
    return await githubService.readFile(owner, repo, path)
  }

  async writeFile(project: string, path: string, content: string, message?: string): Promise<void> {
    const parts = project.split('/')
    const owner = parts[0]
    const repo = parts[1]
    if (!owner || !repo) throw new Error('Invalid project identifier')
    
    const result = await githubService.commitChanges(
      owner, 
      repo, 
      path, 
      content, 
      message || `Update ${path}`
    )
    if (!result.success) {
      throw new Error(result.error || 'Failed to write file')
    }
  }

  async deleteFile(project: string, path: string): Promise<void> {
    const parts = project.split('/')
    const owner = parts[0]
    const repo = parts[1]
    if (!owner || !repo) throw new Error('Invalid project identifier')
    
    const result = await githubService.deleteFile(owner, repo, path)
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete file')
    }
  }

  async renameFile(project: string, oldPath: string, newPath: string): Promise<void> {
    const parts = project.split('/')
    const owner = parts[0]
    const repo = parts[1]
    if (!owner || !repo) throw new Error('Invalid project identifier')
    
    const result = await githubService.renameFile(owner, repo, oldPath, newPath)
    if (!result.success) {
      throw new Error(result.error || 'Failed to rename file')
    }
  }
}
