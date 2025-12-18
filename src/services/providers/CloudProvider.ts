import type { StorageProvider, ProviderCapabilities } from '../../types/providers'
import type { FileItem } from '../../types/files'

/**
 * Stub for Cloud Providers (Google Drive, Nextcloud, etc.)
 * These will proxy through our unified /api/storage backend.
 */
export class CloudProvider implements StorageProvider {
  id: string
  name: string
  icon: string
  capabilities: ProviderCapabilities = {
    canCommit: false,
    canShare: true,
    canDelete: true,
    canRename: true,
    isOffline: false,
    hasSessions: true
  }

  constructor(id: string, name: string, icon: string) {
    this.id = id
    this.name = name
    this.icon = icon
  }

  async listFiles(_project: string, _path: string = ''): Promise<FileItem[]> {
    console.warn(`[CloudProvider:${this.id}] listFiles stub called`)
    return []
  }

  async readFile(_project: string, _path: string): Promise<string> {
    console.warn(`[CloudProvider:${this.id}] readFile stub called`)
    return ''
  }

  async writeFile(_project: string, _path: string, _content: string): Promise<void> {
    console.warn(`[CloudProvider:${this.id}] writeFile stub called`)
  }

  async deleteFile(_project: string, _path: string): Promise<void> {
    console.warn(`[CloudProvider:${this.id}] deleteFile stub called`)
  }
}
