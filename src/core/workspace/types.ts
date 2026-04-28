export type AuthMode = 'anonymous' | 'host-authenticated' | 'guest-authenticated' | 'auth-required' | 'auth-error'

export interface WorkspaceRef {
  providerId: string
  workspaceId: string
  displayName: string
}

export interface WorkspaceSummary extends WorkspaceRef {
  description?: string | null
  metadata?: Record<string, unknown>
}

export interface WorkspaceHandle extends WorkspaceRef {
  metadata?: Record<string, unknown>
  access?: {
    sessionId?: string
  }
}

export type DocumentKind = 'text' | 'notebook' | 'image' | 'pdf' | 'binary'

export interface DocumentRef {
  workspaceId: string
  path: string
  kind: DocumentKind
  language: string
  isQuarto: boolean
}

export interface BufferState {
  document: DocumentRef | null
  content: string
  baseRevision: string | null
  dirty: boolean
  lastSavedAt: number | null
  saveTarget: 'provider' | 'session'
}

export interface SessionRef {
  sessionId: string
  roomId: string
  role: 'host' | 'guest'
  allowedPaths: string[]
  owner: string
  members: string[]
}

export interface AuthContext {
  hostUser: { login: string; name?: string; avatarUrl?: string } | null
  guestUser: { email: string; name?: string } | null
  authMode: AuthMode
  status: 'idle' | 'loading' | 'ready' | 'error'
}

export interface ConnectionState {
  transport: 'partykit' | 'none'
  status: 'idle' | 'bootstrap' | 'hydrate' | 'connect' | 'syncing' | 'connected' | 'disconnected' | 'reconnecting' | 'failed'
  lastError: string | null
}

export interface WorkspaceEntry {
  path: string
  name: string
  type: 'file' | 'folder'
}

export interface DocumentSnapshot {
  content: string
  revision: string | null
  metadata?: Record<string, unknown>
}

export interface WriteResult {
  revision: string | null
  savedAt: number
}

export interface CreateResult {
  path: string
  revision?: string | null
}

export interface ProviderAuthState {
  status: 'authenticated' | 'anonymous' | 'expired'
  user?: { id?: string; label: string }
}

export interface ProviderCapabilities {
  supportsCommit: boolean
  supportsRealtime: boolean
  supportsShare: boolean
  supportsRename: boolean
  supportsFolders: boolean
  supportsBinaryRead: boolean
  supportsExecution: boolean
  supportsLanguageService: boolean
}

export interface WriteDocumentOptions {
  message?: string
  baseRevision?: string | null
}

export interface CreateEntryInput {
  path: string
  type: 'file' | 'folder'
  content?: string
  message?: string
}

export interface WorkspaceProvider {
  id: string
  name: string
  icon: string
  listWorkspaces(): Promise<WorkspaceSummary[]>
  openWorkspace(ref: WorkspaceRef, context?: { sessionId?: string }): Promise<WorkspaceHandle>
  getCapabilities(handle: WorkspaceHandle): ProviderCapabilities
  listEntries(handle: WorkspaceHandle, path?: string): Promise<WorkspaceEntry[]>
  readDocument(handle: WorkspaceHandle, path: string): Promise<DocumentSnapshot>
  writeDocument(handle: WorkspaceHandle, path: string, content: string, options?: WriteDocumentOptions): Promise<WriteResult>
  deleteEntry(handle: WorkspaceHandle, path: string): Promise<void>
  renameEntry(handle: WorkspaceHandle, from: string, to: string): Promise<void>
  createEntry(handle: WorkspaceHandle, input: CreateEntryInput): Promise<CreateResult>
  getAuthState(): Promise<ProviderAuthState>
  login?(options?: unknown): Promise<void>
  logout?(): Promise<void>
}

export interface SessionBootstrapResult {
  workspace: WorkspaceRef | null
  initialDocumentPath: string | null
  session: SessionRef
}

export function detectDocumentKind(path: string): DocumentKind {
  const lower = path.toLowerCase()
  if (lower.endsWith('.ipynb')) return 'notebook'
  if (/\.(png|jpg|jpeg|gif|svg|webp)$/.test(lower)) return 'image'
  if (lower.endsWith('.pdf')) return 'pdf'
  if (/\.(qmd|md|rmd|txt|yaml|yml|json|toml|css|scss|lua|py|r|jl|js|ts|vue|html|bib|csl)$/.test(lower)) {
    return 'text'
  }
  return 'binary'
}

export function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  switch (ext) {
    case 'qmd':
    case 'md':
    case 'rmd':
      return 'markdown'
    case 'py':
      return 'python'
    case 'r':
      return 'r'
    case 'jl':
      return 'julia'
    case 'yml':
    case 'yaml':
      return 'yaml'
    case 'json':
      return 'json'
    case 'css':
    case 'scss':
      return 'css'
    case 'ts':
      return 'typescript'
    case 'js':
      return 'javascript'
    case 'vue':
      return 'vue'
    case 'html':
      return 'html'
    default:
      return ext || 'text'
  }
}

export function isQuartoDocument(path: string): boolean {
  return /\.(qmd|rmd|md)$/i.test(path)
}

export function toDocumentRef(workspaceId: string, path: string): DocumentRef {
  return {
    workspaceId,
    path,
    kind: detectDocumentKind(path),
    language: detectLanguage(path),
    isQuarto: isQuartoDocument(path),
  }
}
