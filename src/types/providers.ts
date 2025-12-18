import type { FileItem } from './files'

export interface ProviderCapabilities {
  canCommit: boolean
  canShare: boolean
  canDelete: boolean
  canRename: boolean
  isOffline: boolean
  hasSessions: boolean
}

export interface StorageProvider {
  id: string
  name: string
  icon: string
  capabilities: ProviderCapabilities

  // Project Management
  listProjects?(path?: string): Promise<any[]>
  
  // File Operations
  listFiles(project: string, path?: string): Promise<FileItem[]>
  readFile(project: string, path: string): Promise<string>
  writeFile(project: string, path: string, content: string, message?: string): Promise<void>
  deleteFile(project: string, path: string): Promise<void>
  renameFile?(project: string, oldPath: string, newPath: string): Promise<void>
  createFolder?(project: string, path: string): Promise<void>

  // Authentication
  login?(options?: any): Promise<void>
  logout?(): Promise<void>
  isAuthenticated?(): Promise<boolean>
}
