import type { StorageProvider, ProviderCapabilities } from '../../types/providers'
import type { FileItem } from '../../types/files'
import { createStorage } from 'unstorage'
// @ts-ignore
import indexedDbDriver from 'unstorage/drivers/indexedb'
import { get, set, keys as idbKeys, del } from 'idb-keyval'

export interface LocalProjectMetadata {
  id: string
  name: string
  type: 'browser' | 'disk'
  lastOpened: number
}

export class LocalProvider implements StorageProvider {
  id = 'local'
  name = 'Local'
  icon = 'monitor'
  capabilities: ProviderCapabilities = {
    canCommit: false,
    canShare: false,
    canDelete: true,
    canRename: true,
    isOffline: true,
    hasSessions: false
  }

  // Browser-based storage
  private browserStorage = createStorage({
    driver: (typeof indexedDbDriver === 'function' 
      ? indexedDbDriver 
      : (indexedDbDriver as any).default)({ base: 'quartier:local:' })
  })

  // Disk handles (Map project ID to handle)
  private diskHandles = new Map<string, FileSystemDirectoryHandle>()
  private initialized = false

  private async initialize() {
    if (this.initialized) return
    // Load persisted disk handles from idb-keyval
    const keys = await idbKeys()
    for (const key of keys) {
      if (typeof key === 'string' && key.startsWith('quartier:handle:')) {
        const handle = await get(key)
        if (handle) {
          const id = key.replace('quartier:handle:', '')
          this.diskHandles.set(id, handle)
        }
      }
    }
    this.initialized = true
  }

  async listProjects(): Promise<LocalProjectMetadata[]> {
    await this.initialize()
    
    // 1. Get browser projects (namespaces)
    const bKeys = await this.browserStorage.getKeys()
    const browserProjects: LocalProjectMetadata[] = bKeys
      .filter(k => k.endsWith(':.quartier'))
      .map(k => {
          const name = k.split(':')[0] || 'Unknown'
          return {
            id: `browser:${name}`,
            name: name,
            type: 'browser',
            lastOpened: Date.now()
          }
      })

    // 2. Get active disk projects
    const diskProjects: LocalProjectMetadata[] = Array.from(this.diskHandles.entries()).map(([id, handle]) => ({
      id: id,
      name: handle.name,
      type: 'disk',
      lastOpened: Date.now()
    }))

    return [...browserProjects, ...diskProjects]
  }

  async listFiles(project: string, path: string = ''): Promise<FileItem[]> {
    await this.initialize()
    if (project.startsWith('disk:')) {
      return this.listDiskFiles(project, path)
    }
    return this.listBrowserFiles(project.replace('browser:', ''), path)
  }

  async readFile(project: string, path: string): Promise<string> {
    await this.initialize()
    if (project.startsWith('disk:')) {
      return this.readDiskFile(project, path)
    }
    return this.readBrowserFile(project.replace('browser:', ''), path)
  }

  async writeFile(project: string, path: string, content: string, _message?: string): Promise<void> {
    await this.initialize()
    if (project.startsWith('disk:')) {
      return this.writeDiskFile(project, path, content)
    }
    return this.writeBrowserFile(project.replace('browser:', ''), path, content)
  }

  async deleteFile(project: string, path: string): Promise<void> {
    await this.initialize()
    if (project.startsWith('disk:')) {
      return this.deleteDiskFile(project, path)
    }
    return this.deleteBrowserFile(project.replace('browser:', ''), path)
  }

  async renameFile(project: string, oldPath: string, newPath: string): Promise<void> {
    const content = await this.readFile(project, oldPath)
    await this.writeFile(project, newPath, content)
    await this.deleteFile(project, oldPath)
  }

  // --- Browser Storage Helpers ---

  private async listBrowserFiles(ns: string, path: string): Promise<FileItem[]> {
    const keys = await this.browserStorage.getKeys(ns ? `${ns}:` : '')
    const items: FileItem[] = []
    const seen = new Set<string>()

    for (const key of keys) {
      const relativePath = ns ? key.replace(`${ns}:`, '') : key
      if (path && !relativePath.startsWith(`${path}/`)) continue
      
      const subPath = path ? relativePath.replace(`${path}/`, '') : relativePath
      const parts = subPath.split('/')
      const name = parts[0]
      if (!name || name === '.quartier') continue

      const fullItemPath = path ? `${path}/${name}` : name
      if (seen.has(fullItemPath)) continue
      seen.add(fullItemPath)
      
      items.push({
        path: fullItemPath,
        type: parts.length > 1 ? 'dir' : 'file'
      })
    }
    return items
  }

  private async readBrowserFile(ns: string, path: string): Promise<string> {
    const content = await this.browserStorage.getItem(`${ns}:${path}`)
    return String(content ?? '')
  }

  private async writeBrowserFile(ns: string, path: string, content: string): Promise<void> {
    await this.browserStorage.setItem(`${ns}:${path}`, content)
  }

  private async deleteBrowserFile(ns: string, path: string): Promise<void> {
    await this.browserStorage.removeItem(`${ns}:${path}`)
  }

  // --- Disk Storage Helpers ---

  private async listDiskFiles(project: string, _path: string): Promise<FileItem[]> {
    const handle = await this.getHandle(project)
    const items: FileItem[] = []
    for await (const entry of (handle as any).values()) {
       items.push({
         path: entry.name,
         type: entry.kind === 'directory' ? 'dir' : 'file'
       })
    }
    return items
  }

  private async readDiskFile(project: string, path: string): Promise<string> {
    const handle = await this.getHandle(project)
    const fileHandle = await this.getFileHandle(handle, path)
    const file = await fileHandle.getFile()
    return await file.text()
  }

  private async writeDiskFile(project: string, path: string, content: string): Promise<void> {
    const handle = await this.getHandle(project)
    const fileHandle = await this.getFileHandle(handle, path, { create: true })
    const writable = await (fileHandle as any).createWritable()
    await writable.write(content)
    await writable.close()
  }

  private async deleteDiskFile(project: string, path: string): Promise<void> {
    const handle = await this.getHandle(project)
    const parts = path.split('/')
    const fileName = parts.pop()!
    const dirPath = parts.join('/')
    const dirHandle = dirPath ? await this.getDirHandle(handle, dirPath) : handle
    await (dirHandle as any).removeEntry(fileName)
  }

  private async getHandle(id: string): Promise<FileSystemDirectoryHandle> {
    const handle = this.diskHandles.get(id)
    if (!handle) throw new Error('No folder handle found')
    
    // Check permission - this might trigger a prompt
    const status = await (handle as any).queryPermission({ mode: 'readwrite' })
    if (status !== 'granted') {
      const newStatus = await (handle as any).requestPermission({ mode: 'readwrite' })
      if (newStatus !== 'granted') throw new Error('Permission denied to access folder')
    }
    
    return handle
  }

  async openDirectory(): Promise<string> {
    if (!('showDirectoryPicker' in window)) throw new Error('File System Access API not supported')
    const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
    const id = `disk:${handle.name}`
    this.diskHandles.set(id, handle)
    // Persist handle
    await set(`quartier:handle:${id}`, handle)
    return id
  }

  async removeProject(id: string) {
    if (id.startsWith('disk:')) {
      this.diskHandles.delete(id)
      await del(`quartier:handle:${id}`)
    } else {
      // For browser, we'd need to clear all keys in that namespace
      const ns = id.replace('browser:', '')
      const keys = await this.browserStorage.getKeys(`${ns}:`)
      for (const k of keys) await this.browserStorage.removeItem(k)
    }
  }

  async createBrowserProject(name: string): Promise<string> {
    const id = `browser:${name}`
    await this.browserStorage.setItem(`${name}:.quartier`, JSON.stringify({ created: Date.now() }))
    return id
  }

  private async getFileHandle(root: FileSystemDirectoryHandle, path: string, options = {}): Promise<FileSystemFileHandle> {
    const parts = path.split('/')
    const fileName = parts.pop()!
    let current = root
    for (const part of parts) {
      if (!part) continue
      current = await current.getDirectoryHandle(part, options)
    }
    return await current.getFileHandle(fileName, options)
  }

  private async getDirHandle(root: FileSystemDirectoryHandle, path: string, options = {}): Promise<FileSystemDirectoryHandle> {
    const parts = path.split('/')
    let current = root
    for (const part of parts) {
      if (!part) continue
      current = await current.getDirectoryHandle(part, options)
    }
    return current
  }
}
