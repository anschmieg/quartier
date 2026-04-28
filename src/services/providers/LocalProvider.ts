import type {
  CreateEntryInput,
  CreateResult,
  DocumentSnapshot,
  ProviderAuthState,
  ProviderCapabilities,
  WorkspaceEntry,
  WorkspaceHandle,
  WorkspaceProvider,
  WorkspaceRef,
  WorkspaceSummary,
  WriteDocumentOptions,
  WriteResult,
} from '@/core/workspace/types'
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

const capabilities: ProviderCapabilities = {
  supportsCommit: false,
  supportsRealtime: false,
  supportsShare: false,
  supportsRename: true,
  supportsFolders: true,
  supportsBinaryRead: true,
  supportsExecution: false,
  supportsLanguageService: true,
}

export class LocalProvider implements WorkspaceProvider {
  id = 'local'
  name = 'Local'
  icon = 'monitor'

  private browserStorage = createStorage({
    driver: (typeof indexedDbDriver === 'function'
      ? indexedDbDriver
      : (indexedDbDriver as any).default)({ base: 'quartier:local:' }),
  })

  private diskHandles = new Map<string, FileSystemDirectoryHandle>()
  private initialized = false

  private async initialize() {
    if (this.initialized) return
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
    const workspaces = await this.listWorkspaces()
    return workspaces.map((workspace) => ({
      id: workspace.workspaceId,
      name: workspace.displayName,
      type: workspace.workspaceId.startsWith('disk:') ? 'disk' : 'browser',
      lastOpened: Date.now(),
    }))
  }

  async listWorkspaces(): Promise<WorkspaceSummary[]> {
    await this.initialize()
    const browserKeys = await this.browserStorage.getKeys()
    const browserProjects = browserKeys
      .filter((key) => key.endsWith(':.quartier'))
      .map((key) => {
        const name = key.split(':')[0] || 'Unknown'
        return {
          providerId: this.id,
          workspaceId: `browser:${name}`,
          displayName: name,
          metadata: { type: 'browser' },
        } satisfies WorkspaceSummary
      })

    const diskProjects = Array.from(this.diskHandles.entries()).map(([id, handle]) => ({
      providerId: this.id,
      workspaceId: id,
      displayName: handle.name,
      metadata: { type: 'disk' },
    } satisfies WorkspaceSummary))

    return [...browserProjects, ...diskProjects]
  }

  async openWorkspace(ref: WorkspaceRef): Promise<WorkspaceHandle> {
    await this.initialize()
    return {
      ...ref,
      metadata: {
        type: ref.workspaceId.startsWith('disk:') ? 'disk' : 'browser',
      },
    }
  }

  getCapabilities(_handle: WorkspaceHandle): ProviderCapabilities {
    return capabilities
  }

  async listEntries(handle: WorkspaceHandle, path = ''): Promise<WorkspaceEntry[]> {
    await this.initialize()
    if (handle.workspaceId.startsWith('disk:')) {
      return this.listDiskEntries(handle.workspaceId, path)
    }
    return this.listBrowserEntries(handle.workspaceId.replace('browser:', ''), path)
  }

  async readDocument(handle: WorkspaceHandle, path: string): Promise<DocumentSnapshot> {
    await this.initialize()
    const content = handle.workspaceId.startsWith('disk:')
      ? await this.readDiskFile(handle.workspaceId, path)
      : await this.readBrowserFile(handle.workspaceId.replace('browser:', ''), path)
    return {
      content,
      revision: `${Date.now()}`,
      metadata: { path },
    }
  }

  async writeDocument(handle: WorkspaceHandle, path: string, content: string, _options?: WriteDocumentOptions): Promise<WriteResult> {
    await this.initialize()
    if (handle.workspaceId.startsWith('disk:')) {
      await this.writeDiskFile(handle.workspaceId, path, content)
    } else {
      await this.writeBrowserFile(handle.workspaceId.replace('browser:', ''), path, content)
    }
    return {
      revision: `${Date.now()}`,
      savedAt: Date.now(),
    }
  }

  async deleteEntry(handle: WorkspaceHandle, path: string): Promise<void> {
    await this.initialize()
    if (handle.workspaceId.startsWith('disk:')) {
      await this.deleteDiskFile(handle.workspaceId, path)
    } else {
      await this.deleteBrowserFile(handle.workspaceId.replace('browser:', ''), path)
    }
  }

  async renameEntry(handle: WorkspaceHandle, from: string, to: string): Promise<void> {
    const snapshot = await this.readDocument(handle, from)
    await this.writeDocument(handle, to, snapshot.content)
    await this.deleteEntry(handle, from)
  }

  async createEntry(handle: WorkspaceHandle, input: CreateEntryInput): Promise<CreateResult> {
    if (input.type === 'folder') {
      if (handle.workspaceId.startsWith('disk:')) {
        const root = await this.getHandle(handle.workspaceId)
        await this.getDirHandle(root, input.path, { create: true })
      } else {
        await this.browserStorage.setItem(`${handle.workspaceId.replace('browser:', '')}:${input.path}/.quartier-folder`, '')
      }
      return { path: input.path }
    }

    const result = await this.writeDocument(handle, input.path, input.content || '')
    return {
      path: input.path,
      revision: result.revision,
    }
  }

  async getAuthState(): Promise<ProviderAuthState> {
    return { status: 'authenticated', user: { label: 'Local Workspace' } }
  }

  async openDirectory(): Promise<string> {
    if (!('showDirectoryPicker' in window)) throw new Error('File System Access API not supported')
    const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
    const id = `disk:${handle.name}`
    this.diskHandles.set(id, handle)
    await set(`quartier:handle:${id}`, handle)
    return id
  }

  async removeProject(id: string) {
    if (id.startsWith('disk:')) {
      this.diskHandles.delete(id)
      await del(`quartier:handle:${id}`)
      return
    }

    const ns = id.replace('browser:', '')
    const keys = await this.browserStorage.getKeys(`${ns}:`)
    for (const key of keys) {
      await this.browserStorage.removeItem(key)
    }
  }

  async createBrowserProject(name: string): Promise<string> {
    const id = `browser:${name}`
    await this.browserStorage.setItem(`${name}:.quartier`, JSON.stringify({ created: Date.now() }))
    return id
  }

  private async listBrowserEntries(ns: string, path: string): Promise<WorkspaceEntry[]> {
    const keys = await this.browserStorage.getKeys(ns ? `${ns}:` : '')
    const items: WorkspaceEntry[] = []
    const seen = new Set<string>()

    for (const key of keys) {
      const relativePath = ns ? key.replace(`${ns}:`, '') : key
      if (path && !relativePath.startsWith(`${path}/`)) continue

      const subPath = path ? relativePath.replace(`${path}/`, '') : relativePath
      const parts = subPath.split('/')
      const name = parts[0]
      if (!name || name.startsWith('.quartier')) continue

      const fullPath = path ? `${path}/${name}` : name
      if (seen.has(fullPath)) continue
      seen.add(fullPath)

      items.push({
        path: fullPath,
        name,
        type: parts.length > 1 ? 'folder' : 'file',
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

  private async listDiskEntries(project: string, path: string): Promise<WorkspaceEntry[]> {
    const handle = await this.getHandle(project)
    const dirHandle = path ? await this.getDirHandle(handle, path) : handle
    const items: WorkspaceEntry[] = []
    for await (const entry of (dirHandle as any).values()) {
      items.push({
        path: path ? `${path}/${entry.name}` : entry.name,
        name: entry.name,
        type: entry.kind === 'directory' ? 'folder' : 'file',
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
    await (dirHandle as any).removeEntry(fileName, { recursive: true })
  }

  private async getHandle(id: string): Promise<FileSystemDirectoryHandle> {
    const handle = this.diskHandles.get(id)
    if (!handle) throw new Error('No folder handle found')
    const status = await (handle as any).queryPermission({ mode: 'readwrite' })
    if (status !== 'granted') {
      const nextStatus = await (handle as any).requestPermission({ mode: 'readwrite' })
      if (nextStatus !== 'granted') throw new Error('Permission denied to access folder')
    }
    return handle
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
