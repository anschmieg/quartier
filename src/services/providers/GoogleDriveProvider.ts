import type { StorageProvider, ProviderCapabilities } from '../../types/providers'
import type { FileItem } from '../../types/files'

// Types for Google Identity Services
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
    parents?: string[]
}

export class GoogleDriveProvider implements StorageProvider {
    id = 'gdrive'
    name = 'Google Drive'
    icon = 'cloud' // Generic cloud icon for now, or use specific if available
    
    capabilities: ProviderCapabilities = {
        canCommit: false, // Drive saves directly, "commit" metaphor doesn't perfectly fit but could be 'save'
        canShare: true,   // Via Drive link
        canDelete: true,
        canRename: true,
        isOffline: false,
        hasSessions: false
    }

    private accessToken: string | null = null
    private tokenClient: TokenClient | null = null
    private tokenExpiry: number | null = null

    constructor() {
        // Try to load persisted token
        const storedToken = localStorage.getItem('quartier:gdrive:token')
        const storedExpiry = localStorage.getItem('quartier:gdrive:expiry')
        
        if (storedToken && storedExpiry) {
            const expiry = parseInt(storedExpiry)
            if (Date.now() < expiry) {
                this.accessToken = storedToken
                this.tokenExpiry = expiry
            } else {
                this.logout()
            }
        }
        
        this.loadGoogleScript()
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

    async isAuthenticated(): Promise<boolean> {
        if (!this.accessToken) return false
        if (this.tokenExpiry && Date.now() > this.tokenExpiry) {
            this.logout()
            return false
        }
        return true
    }

    async login(): Promise<void> {
        return new Promise((resolve, reject) => {
            const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
            if (!clientId) {
                return reject(new Error('VITE_GOOGLE_CLIENT_ID not configured'))
            }

            if (!window.google) {
                return reject(new Error('Google Identity Services not loaded'))
            }

            this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
                callback: (response: TokenResponse) => {
                    if (response.error) {
                        reject(response.error)
                        return
                    }
                    
                    this.accessToken = response.access_token
                    // Token usually expires in 3600s
                    this.tokenExpiry = Date.now() + (response.expires_in * 1000)
                    
                    localStorage.setItem('quartier:gdrive:token', this.accessToken)
                    localStorage.setItem('quartier:gdrive:expiry', this.tokenExpiry.toString())
                    
                    resolve()
                },
            })

            this.tokenClient.requestAccessToken()
        })
    }

    async logout(): Promise<void> {
        this.accessToken = null
        this.tokenExpiry = null
        localStorage.removeItem('quartier:gdrive:token')
        localStorage.removeItem('quartier:gdrive:expiry')
        
        // Revoke support could be added here
        if (window.google && this.accessToken) {
             // google.accounts.oauth2.revoke(this.accessToken, () => {})
        }
    }

    // Helper for fetch with auth
    private async fetchDrive(endpoint: string, options: RequestInit = {}) {
        if (!await this.isAuthenticated()) {
            throw new Error('Not authenticated')
        }

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${this.accessToken}`
        }

        const res = await fetch(`https://www.googleapis.com/drive/v3${endpoint}`, {
            ...options,
            headers
        })

        if (!res.ok) {
            if (res.status === 401) {
                this.logout()
                throw new Error('Authentication expired')
            }
            const err = await res.json().catch(() => ({})) as any
            throw new Error(err?.error?.message || `Drive API error: ${res.statusText}`)
        }

        return res
    }

    async listProjects(folderId?: string): Promise<any[]> {
        // If folderId is provided, list subfolders of that ID.
        // Otherwise list root folders.
        const parent = folderId || 'root'
        const q = `'${parent}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
        
        const res = await this.fetchDrive(`/files?q=${encodeURIComponent(q)}&fields=files(id,name)`)
        const data = await res.json() as { files: DriveFile[] }
        
        return data.files.map(f => ({
            id: f.id,
            name: f.name,
            updated_at: new Date().toISOString()
        }))
    }

    async listFiles(project: string, _path: string = ''): Promise<FileItem[]> {
        // 'project' is the folder ID.
        // 'path' is ignored for flat list or we need recursive search.
        // For simplicity, let's treat 'project' as the root folder we are in.
        // If we want nested folders, we'd need to traverse by parent ID.
        
        // If traversing a subfolder, _path is the folder ID. 
        // We need to resolve the ACTUAL folder ID from the path string (last segment)
        // because we are constructing paths like 'parentID/childID' for the UI.
        const parentPath = _path
        const folderId = parentPath ? parentPath.split('/').pop()! : project
        
        const q = `'${folderId}' in parents and trashed = false`
        const res = await this.fetchDrive(`/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType)`)
        const data = await res.json() as { files: DriveFile[] }

        return data.files.map(f => ({
            // Construct a path that includes the parent path so FileTree can see nesting
            path: parentPath ? `${parentPath}/${f.id}` : f.id,
            name: f.name,
            type: f.mimeType === 'application/vnd.google-apps.folder' ? 'dir' : 'file'
        }))
    }

    async readFile(_project: string, path: string): Promise<string> {
        // Extract ID from path (last segment)
        const fileId = path.split('/').pop() || path
        const res = await this.fetchDrive(`/files/${fileId}?alt=media`)
        return await res.text()
    }

    async writeFile(_project: string, path: string, content: string, _message?: string): Promise<void> {
        // path might be 'parentID/fileID' or just 'fileID'
        const fileId = path.split('/').pop() || path
        
        // Let's try to update assuming it's an ID
        try {
             await this.fetchDrive(`/files/${fileId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json' // Metadata update only? No.
                },
                // Updating content in Drive API requires upload endpoint usually:
                // https://www.googleapis.com/upload/drive/v3/files/[fileId]?uploadType=media
            })
            // Updating content properly:
             const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'text/plain'
                },
                body: content
            })
             if (!uploadRes.ok) throw new Error('Failed to upload content')
        } catch (e) {
             // If failed, maybe it was a new file creation request?
             // Need strict separation or check if file exists.
             throw e
        }
    }
    
    // Custom method to create file since generic interface is path-based
    async createNewFile(folderId: string, name: string, content: string): Promise<string> {
        const metadata = {
            name,
            parents: [folderId]
        }
        
        // Multipart upload
        const boundary = '-------314159265358979323846'
        const delimiter = "\r\n--" + boundary + "\r\n"
        const close_delim = "\r\n--" + boundary + "--"
        
        const body = delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: text/plain\r\n\r\n' +
            content +
            close_delim

        const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'multipart/related; boundary="' + boundary + '"'
            },
            body
        })
        
        if (!res.ok) throw new Error('Create failed')
        const data = await res.json() as any
        return data.id
    }

    async deleteFile(_project: string, path: string): Promise<void> {
        const fileId = path.split('/').pop() || path
        await this.fetchDrive(`/files/${fileId}`, { method: 'DELETE' })
    }

    async createFolder(project: string, path: string): Promise<void> {
        // path is name
        const metadata = {
            name: path,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [project]
        }
        await this.fetchDrive('/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(metadata)
        })
    }
}
