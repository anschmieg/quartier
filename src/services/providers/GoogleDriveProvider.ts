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
import { browserCredentialRepository } from '@/core/state/BrowserCredentialRepository'

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string
            scope: string
            callback: (response: TokenResponse) => void
          }): TokenClient
        }
      }
    }
  }
}

interface TokenClient {
  requestAccessToken(): void
}

interface TokenResponse {
  access_token: string
  expires_in: number
  error?: string
}

interface DriveFile {
  id: string
  name: string
  mimeType: string
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

export class GoogleDriveProvider implements WorkspaceProvider {
  id = 'gdrive'
  name = 'Google Drive'
  icon = 'cloud'

  private accessToken: string | null = null
  private tokenClient: TokenClient | null = null
  private tokenExpiry: number | null = null
  private initialized = false

  constructor() {
    this.loadGoogleScript()
  }

  private async initialize() {
    if (this.initialized) return
    const stored = await browserCredentialRepository.get<{ token: string; expiry: number }>('gdrive')
    if (stored && Date.now() < stored.expiry) {
      this.accessToken = stored.token
      this.tokenExpiry = stored.expiry
    } else if (stored) {
      await browserCredentialRepository.clear('gdrive')
    }
    this.initialized = true
  }

  private loadGoogleScript() {
    if (document.getElementById('gsi-script')) return
    const script = document.createElement('script')
    script.id = 'gsi-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.body.appendChild(script)
  }

  private async fetchDrive(endpoint: string, options: RequestInit = {}) {
    await this.initialize()
    if (!await this.isAuthenticated()) {
      throw new Error('Not authenticated')
    }

    const res = await fetch(`https://www.googleapis.com/drive/v3${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.accessToken}`,
      },
    })

    if (!res.ok) {
      if (res.status === 401) {
        await this.logout?.()
        throw new Error('Authentication expired')
      }
      const err = await res.json().catch(() => ({})) as any
      throw new Error(err?.error?.message || `Drive API error: ${res.statusText}`)
    }
    return res
  }

  async isAuthenticated(): Promise<boolean> {
    await this.initialize()
    return !!this.accessToken && !!this.tokenExpiry && Date.now() < this.tokenExpiry
  }

  async listWorkspaces(): Promise<WorkspaceSummary[]> {
    await this.initialize()
    if (!await this.isAuthenticated()) return []
    const res = await this.fetchDrive(`/files?q=${encodeURIComponent(`'root' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`)}&fields=files(id,name)`)
    const data = await res.json() as { files: DriveFile[] }
    return data.files.map((file) => ({
      providerId: this.id,
      workspaceId: file.id,
      displayName: file.name,
      metadata: { folderId: file.id },
    }))
  }

  async openWorkspace(ref: WorkspaceRef): Promise<WorkspaceHandle> {
    return {
      ...ref,
      metadata: { folderId: ref.workspaceId },
    }
  }

  getCapabilities(_handle: WorkspaceHandle): ProviderCapabilities {
    return capabilities
  }

  async listEntries(handle: WorkspaceHandle, path = ''): Promise<WorkspaceEntry[]> {
    const folderId = path ? path.split('/').pop() || path : String(handle.metadata?.folderId || handle.workspaceId)
    const res = await this.fetchDrive(`/files?q=${encodeURIComponent(`'${folderId}' in parents and trashed = false`)}&fields=files(id,name,mimeType)`)
    const data = await res.json() as { files: DriveFile[] }
    return data.files.map((file) => ({
      path: path ? `${path}/${file.id}` : file.id,
      name: file.name,
      type: file.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
    }))
  }

  async readDocument(_handle: WorkspaceHandle, path: string): Promise<DocumentSnapshot> {
    const fileId = path.split('/').pop() || path
    const res = await this.fetchDrive(`/files/${fileId}?alt=media`)
    return {
      content: await res.text(),
      revision: `${Date.now()}`,
      metadata: { fileId },
    }
  }

  async writeDocument(_handle: WorkspaceHandle, path: string, content: string, _options?: WriteDocumentOptions): Promise<WriteResult> {
    const fileId = path.split('/').pop() || path
    const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'text/plain',
      },
      body: content,
    })
    if (!uploadRes.ok) throw new Error('Failed to upload content')
    return {
      revision: `${Date.now()}`,
      savedAt: Date.now(),
    }
  }

  async deleteEntry(_handle: WorkspaceHandle, path: string): Promise<void> {
    const fileId = path.split('/').pop() || path
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.accessToken}` },
    })
    if (!res.ok) throw new Error('Failed to delete entry')
  }

  async renameEntry(_handle: WorkspaceHandle, from: string, to: string): Promise<void> {
    const fileId = from.split('/').pop() || from
    const newName = to.split('/').pop() || to
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newName }),
    })
    if (!res.ok) throw new Error('Failed to rename entry')
  }

  async createEntry(handle: WorkspaceHandle, input: CreateEntryInput): Promise<CreateResult> {
    if (input.type === 'folder') {
      const parentId = input.path.includes('/') ? input.path.split('/').slice(0, -1).pop() || handle.workspaceId : handle.workspaceId
      const res = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: input.path.split('/').pop(),
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        }),
      })
      const data = await res.json() as any
      return { path: data.id || input.path }
    }

    const parentId = input.path.includes('/') ? input.path.split('/').slice(0, -1).pop() || handle.workspaceId : handle.workspaceId
    const name = input.path.split('/').pop() || 'Untitled'
    const metadata = { name, parents: [parentId] }
    const boundary = '-------314159265358979323846'
    const delimiter = `\r\n--${boundary}\r\n`
    const closeDelim = `\r\n--${boundary}--`
    const body = delimiter
      + 'Content-Type: application/json\r\n\r\n'
      + JSON.stringify(metadata)
      + delimiter
      + 'Content-Type: text/plain\r\n\r\n'
      + (input.content || '')
      + closeDelim

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body,
    })
    const data = await res.json() as any
    return { path: data.id || input.path }
  }

  async getAuthState(): Promise<ProviderAuthState> {
    return await this.isAuthenticated()
      ? { status: 'authenticated', user: { label: 'Google Drive' } }
      : { status: 'anonymous' }
  }

  async login(): Promise<void> {
    return await new Promise((resolve, reject) => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
      if (!clientId) {
        reject(new Error('VITE_GOOGLE_CLIENT_ID not configured'))
        return
      }
      if (!window.google) {
        reject(new Error('Google Identity Services not loaded'))
        return
      }

      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
        callback: async (response: TokenResponse) => {
          if (response.error) {
            reject(new Error(response.error))
            return
          }
          this.accessToken = response.access_token
          this.tokenExpiry = Date.now() + (response.expires_in * 1000)
          await browserCredentialRepository.set('gdrive', {
            token: this.accessToken,
            expiry: this.tokenExpiry,
          })
          resolve()
        },
      })

      this.tokenClient.requestAccessToken()
    })
  }

  async logout(): Promise<void> {
    this.accessToken = null
    this.tokenExpiry = null
    await browserCredentialRepository.clear('gdrive')
  }
}
