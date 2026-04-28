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
import { githubService } from '@/services/github'

const capabilities: ProviderCapabilities = {
  supportsCommit: true,
  supportsRealtime: true,
  supportsShare: true,
  supportsRename: true,
  supportsFolders: false,
  supportsBinaryRead: true,
  supportsExecution: false,
  supportsLanguageService: true,
}

function parseRepo(workspaceId: string) {
  const [owner, repo] = workspaceId.split('/')
  if (!owner || !repo) throw new Error('Invalid GitHub workspace identifier')
  return { owner, repo }
}

export class GitHubProvider implements WorkspaceProvider {
  id = 'github'
  name = 'GitHub'
  icon = 'github'

  async listWorkspaces(): Promise<WorkspaceSummary[]> {
    const repos = await githubService.listRepos()
    return repos.map((repo: any) => ({
      providerId: this.id,
      workspaceId: repo.full_name,
      displayName: repo.full_name,
      description: repo.description,
      metadata: {
        owner: repo.owner?.login,
        repo: repo.name,
      },
    }))
  }

  async openWorkspace(ref: WorkspaceRef, context?: { sessionId?: string }): Promise<WorkspaceHandle> {
    const { owner, repo } = parseRepo(ref.workspaceId)
    return {
      ...ref,
      metadata: { owner, repo },
      access: context?.sessionId ? { sessionId: context.sessionId } : undefined,
    }
  }

  getCapabilities(_handle: WorkspaceHandle): ProviderCapabilities {
    return capabilities
  }

  async listEntries(handle: WorkspaceHandle, path = ''): Promise<WorkspaceEntry[]> {
    const { owner, repo } = parseRepo(handle.workspaceId)
    const data = await githubService.loadRepo(owner, repo, path, { sessionId: handle.access?.sessionId })
    if (!Array.isArray(data)) return []

    return data.map((item: any) => ({
      path: item.path,
      name: item.name || item.path.split('/').pop() || item.path,
      type: item.type === 'dir' ? 'folder' : 'file',
    }))
  }

  async readDocument(handle: WorkspaceHandle, path: string): Promise<DocumentSnapshot> {
    const { owner, repo } = parseRepo(handle.workspaceId)
    const data = await githubService.readDocument(owner, repo, path, { sessionId: handle.access?.sessionId })
    return {
      content: data.content,
      revision: data.sha,
      metadata: { path },
    }
  }

  async writeDocument(handle: WorkspaceHandle, path: string, content: string, options?: WriteDocumentOptions): Promise<WriteResult> {
    const { owner, repo } = parseRepo(handle.workspaceId)
    const result = await githubService.commitChanges(owner, repo, path, content, options?.message || `Update ${path}`)
    if (!result.success) throw new Error(result.error || 'Failed to write document')
    return {
      revision: result.fileSha || result.commitSha || null,
      savedAt: Date.now(),
    }
  }

  async deleteEntry(handle: WorkspaceHandle, path: string): Promise<void> {
    const { owner, repo } = parseRepo(handle.workspaceId)
    const result = await githubService.deleteFile(owner, repo, path)
    if (!result.success) throw new Error(result.error || 'Failed to delete entry')
  }

  async renameEntry(handle: WorkspaceHandle, from: string, to: string): Promise<void> {
    const { owner, repo } = parseRepo(handle.workspaceId)
    const result = await githubService.renameFile(owner, repo, from, to)
    if (!result.success) throw new Error(result.error || 'Failed to rename entry')
  }

  async createEntry(handle: WorkspaceHandle, input: CreateEntryInput): Promise<CreateResult> {
    if (input.type === 'folder') {
      throw new Error('GitHub folders are created implicitly by file creation')
    }
    const writeResult = await this.writeDocument(handle, input.path, input.content || '', { message: input.message || `Create ${input.path}` })
    return {
      path: input.path,
      revision: writeResult.revision,
    }
  }

  async getAuthState(): Promise<ProviderAuthState> {
    const userCookie = document.cookie.match(/(^| )gh_user=([^;]+)/)
    if (!userCookie) return { status: 'anonymous' }
    try {
      const parsed = JSON.parse(decodeURIComponent(userCookie[2] || '{}'))
      return {
        status: 'authenticated',
        user: {
          id: parsed.login,
          label: parsed.login,
        },
      }
    } catch {
      return { status: 'expired' }
    }
  }

  async login() {
    if (import.meta.env.DEV) {
      window.location.href = '/api/oauth/dev-login'
    } else {
      window.location.href = '/api/oauth/login'
    }
  }

  async logout() {
    await fetch('/api/oauth/logout', { method: 'POST' })
  }
}
