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
import type { WebDAVClient, FileStat } from 'webdav'
import { browserCredentialRepository } from '@/core/state/BrowserCredentialRepository'

interface NextcloudCredentials {
  url: string
  username: string
  password: string
}

const capabilities: ProviderCapabilities = {
  supportsCommit: false,
  supportsRealtime: false,
  supportsShare: true,
  supportsRename: true,
  supportsFolders: true,
  supportsBinaryRead: true,
  supportsExecution: false,
  supportsLanguageService: true,
}

export class NextcloudProvider implements WorkspaceProvider {
  id = 'nextcloud'
  name = 'Nextcloud'
  icon = 'cloud'

  private client: WebDAVClient | null = null
  private credentials: NextcloudCredentials | null = null
  private initialized = false

  private async initialize() {
    if (this.initialized) return
    this.credentials = await browserCredentialRepository.get<NextcloudCredentials>('nextcloud')
    this.initialized = true
  }

  private async getClient(): Promise<WebDAVClient> {
    await this.initialize()
    if (this.client) return this.client
    if (!this.credentials) throw new Error('Not authenticated')

    const { createClient } = await import('webdav')
    this.client = createClient('/api/webdav', {
      username: this.credentials.username,
      password: this.credentials.password,
      headers: {
        'X-Target-Base-Url': this.credentials.url,
      },
    })
    return this.client
  }

  private normalizePath(fullPath: string): string {
    if (!this.credentials?.username) return fullPath
    try {
      const safe = decodeURIComponent(fullPath)
      const splitToken = `/files/${this.credentials.username}`
      const idx = safe.lastIndexOf(splitToken)
      if (idx !== -1) {
        return safe.slice(idx + splitToken.length) || '/'
      }
    } catch (error) {
      console.warn('Failed to normalize path', error)
    }
    return fullPath
  }

  async listWorkspaces(): Promise<WorkspaceSummary[]> {
    await this.initialize()
    if (!this.credentials) return []
    const client = await this.getClient()
    const contents = await client.getDirectoryContents('/') as FileStat[]
    return contents
      .filter((item) => item.type === 'directory')
      .map((item) => ({
        providerId: this.id,
        workspaceId: this.normalizePath(item.filename),
        displayName: item.basename,
      }))
  }

  async openWorkspace(ref: WorkspaceRef): Promise<WorkspaceHandle> {
    return {
      ...ref,
      metadata: { rootPath: ref.workspaceId },
    }
  }

  getCapabilities(_handle: WorkspaceHandle): ProviderCapabilities {
    return capabilities
  }

  async listEntries(handle: WorkspaceHandle, path = ''): Promise<WorkspaceEntry[]> {
    const client = await this.getClient()
    const root = String(handle.metadata?.rootPath || handle.workspaceId)
    const normalizedRoot = root.startsWith('/') ? root : `/${root}`
    const sub = path ? (path.startsWith('/') ? path : `/${path}`) : ''
    const target = (normalizedRoot === '/' ? '' : normalizedRoot) + sub || '/'
    const contents = await client.getDirectoryContents(target) as FileStat[]
    return contents.map((item) => ({
      path: this.normalizePath(item.filename),
      name: item.basename,
      type: item.type === 'directory' ? 'folder' : 'file',
    }))
  }

  async readDocument(_handle: WorkspaceHandle, path: string): Promise<DocumentSnapshot> {
    const client = await this.getClient()
    const content = await client.getFileContents(path, { format: 'text' })
    return {
      content: content as string,
      revision: `${Date.now()}`,
      metadata: { path },
    }
  }

  async writeDocument(_handle: WorkspaceHandle, path: string, content: string, _options?: WriteDocumentOptions): Promise<WriteResult> {
    const client = await this.getClient()
    await client.putFileContents(path, content)
    return {
      revision: `${Date.now()}`,
      savedAt: Date.now(),
    }
  }

  async deleteEntry(_handle: WorkspaceHandle, path: string): Promise<void> {
    const client = await this.getClient()
    await client.deleteFile(path)
  }

  async renameEntry(_handle: WorkspaceHandle, from: string, to: string): Promise<void> {
    const client = await this.getClient()
    await client.moveFile(from, to)
  }

  async createEntry(_handle: WorkspaceHandle, input: CreateEntryInput): Promise<CreateResult> {
    const client = await this.getClient()
    if (input.type === 'folder') {
      await client.createDirectory(input.path)
      return { path: input.path }
    }
    await client.putFileContents(input.path, input.content || '')
    return { path: input.path }
  }

  async getAuthState(): Promise<ProviderAuthState> {
    await this.initialize()
    return this.credentials
      ? { status: 'authenticated', user: { label: this.credentials.username } }
      : { status: 'anonymous' }
  }

  async login(options?: unknown): Promise<void> {
    const config = options as NextcloudCredentials | undefined
    if (!config?.url || !config.username || !config.password) {
      throw new Error('Missing credentials')
    }

    let url = config.url.replace(/\/$/, '')
    if (!url.includes('/remote.php/dav')) {
      url = `${url}/remote.php/dav/files/${config.username}`
    }

    const { createClient } = await import('webdav')
    const testClient = createClient('/api/webdav', {
      username: config.username,
      password: config.password,
      headers: {
        'X-Target-Base-Url': url,
      },
    })

    await testClient.getDirectoryContents('/').catch((error) => {
      console.error('Connection failed:', error)
      throw new Error('Failed to connect. Check URL, credentials, and CORS settings.')
    })

    this.credentials = {
      url,
      username: config.username,
      password: config.password,
    }
    await browserCredentialRepository.set('nextcloud', this.credentials)
    this.client = testClient
  }

  async logout(): Promise<void> {
    this.client = null
    this.credentials = null
    await browserCredentialRepository.clear('nextcloud')
  }
}
