import type { SessionBootstrapResult, SessionRef, WorkspaceRef } from '@/core/workspace/types'

interface SharePreviewResponse {
  session: {
    id: string
    name?: string
    paths: string[]
    owner: string
    memberCount: number
  }
  permission: 'edit' | 'view'
}

interface ShareJoinResponse {
  success: boolean
  session: {
    id: string
    name?: string
    paths: string[]
    memberCount: number
  }
  permission: 'edit' | 'view'
}

function deriveWorkspace(paths: string[]): { workspace: WorkspaceRef | null; initialDocumentPath: string | null } {
  const firstPath = paths[0]?.replace(/\/\*$/, '') ?? ''
  const parts = firstPath.split('/')
  if (parts.length < 2) {
    return { workspace: null, initialDocumentPath: null }
  }

  const workspace: WorkspaceRef = {
    providerId: 'github',
    workspaceId: `${parts[0]}/${parts[1]}`,
    displayName: `${parts[0]}/${parts[1]}`,
  }

  const initialDocumentPath = parts.length > 2 && (parts[parts.length - 1] || '').includes('.')
    ? parts.slice(2).join('/')
    : null

  return { workspace, initialDocumentPath }
}

function toSessionRef(input: { id: string; paths: string[]; owner?: string; memberCount?: number; permission: 'edit' | 'view' }): SessionRef {
  return {
    sessionId: input.id,
    roomId: input.id,
    role: input.permission === 'edit' ? 'guest' : 'guest',
    allowedPaths: input.paths,
    owner: input.owner || '',
    members: [],
  }
}

export class SessionBootstrapService {
  async preview(token: string): Promise<SharePreviewResponse> {
    const res = await fetch(`/share/${token}`, { credentials: 'include' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Invalid link' }))
      throw new Error(data.error || 'Invalid link')
    }
    return await res.json()
  }

  async join(token: string): Promise<SessionBootstrapResult> {
    const res = await fetch(`/api/share/${token}`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Failed to join session' }))
      throw new Error(data.error || 'Failed to join session')
    }
    const data = await res.json() as ShareJoinResponse
    const derived = deriveWorkspace(data.session.paths)
    return {
      workspace: derived.workspace,
      initialDocumentPath: derived.initialDocumentPath,
      session: toSessionRef({
        id: data.session.id,
        paths: data.session.paths,
        permission: data.permission,
      }),
    }
  }
}

export const sessionBootstrapService = new SessionBootstrapService()
