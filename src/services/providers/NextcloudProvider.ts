import type { StorageProvider, ProviderCapabilities } from '../../types/providers'
import type { FileItem } from '../../types/files'
import type { WebDAVClient, FileStat } from 'webdav'

// Credentials structure
interface NextcloudCredentials {
    url: string
    username: string
    password: string
}

export class NextcloudProvider implements StorageProvider {
    id = 'nextcloud'
    name = 'Nextcloud'
    icon = 'cloud' // Or specific if we have one
    
    capabilities: ProviderCapabilities = {
        canCommit: false,
        canShare: true, // WebDAV usually supports public links but api varies, set true for generic sharing if possible or false if unimplemented
        canDelete: true,
        canRename: true,
        isOffline: false,
        hasSessions: false
    }

    private client: WebDAVClient | null = null
    private credentials: NextcloudCredentials | null = null

    constructor() {
        const stored = localStorage.getItem('quartier:nextcloud:creds')
        if (stored) {
            try {
                this.credentials = JSON.parse(stored)
                // Don't initialize client yet, wait for first use to allow lazy loading
            } catch (e) {
                console.error('Failed to parse nextcloud credentials', e)
            }
        }
    }

    private async getClient(): Promise<WebDAVClient> {
        if (this.client) return this.client

        if (!this.credentials) {
            throw new Error('Not authenticated')
        }

        // Lazy load webdav library
        const { createClient } = await import('webdav')
        
        // Use local proxy to bypass CORS
        // The proxy lives at /api/webdav and forwards to X-Target-Base-Url
        this.client = createClient('/api/webdav', {
            username: this.credentials.username,
            password: this.credentials.password,
            headers: {
                'X-Target-Base-Url': this.credentials.url
            }
        })

        return this.client
    }

    async isAuthenticated(): Promise<boolean> {
        return !!this.credentials
    }

    async login(options?: any): Promise<void> {
        if (!options?.url || !options?.username || !options?.password) {
            throw new Error('Missing credentials')
        }

        let url = options.url.replace(/\/$/, '')
        
        // Auto-append WebDAV path if missing
        if (!url.includes('/remote.php/dav')) {
            // Standard Nextcloud WebDAV path
            url = `${url}/remote.php/dav/files/${options.username}`
        }

        // Verify connection before saving
        const { createClient } = await import('webdav')
        
        // Use proxy for verification too
        const testClient = createClient('/api/webdav', {
            username: options.username,
            password: options.password,
            headers: {
                'X-Target-Base-Url': url
            }
        })

        try {
            await testClient.getDirectoryContents('/')
        } catch (e) {
            console.error('Connection failed:', e)
            throw new Error('Failed to connect. Check URL, credentials, and CORS settings.')
        }

        // Save
        this.credentials = {
            url: url,
            username: options.username,
            password: options.password
        }
        localStorage.setItem('quartier:nextcloud:creds', JSON.stringify(this.credentials))
        this.client = testClient
    }

    async logout(): Promise<void> {
        this.client = null
        this.credentials = null
        localStorage.removeItem('quartier:nextcloud:creds')
    }

    // --- File Operations ---

    // Helper to strip the WebDAV base path from the full path returned by the library
    private normalizePath(fullPath: string): string {
        if (!this.credentials?.username) return fullPath
        
        try {
            const safeFullPath = decodeURIComponent(fullPath)
            
            // Standard Nextcloud structure: .../remote.php/dav/files/USERNAME/path/to/file
            // We split by /files/USERNAME to get the relative path
            const splitToken = `/files/${this.credentials.username}`
            const idx = safeFullPath.lastIndexOf(splitToken)
            
            if (idx !== -1) {
                // Return everything after /files/USERNAME
                // + splitToken.length gives us the path starting with /
                const result = safeFullPath.slice(idx + splitToken.length)
                return result || '/'
            }
        } catch (e) {
            console.warn('Failed to normalize path', e)
        }
        return fullPath
    }

    async listProjects(folderPath?: string): Promise<any[]> {
        // "Projects" in WebDAV are just folders.
        const client = await this.getClient()
        // If folderPath is provided, it is already relative to root (e.g. /Photos) 
        // because we normalized it in the previous step.
        const path = folderPath || '/'
        
        try {
            const contents = await client.getDirectoryContents(path) as FileStat[]
            
            // Filter only directories
            return contents
                .filter((item) => item.type === 'directory')
                .map((item) => ({
                    id: this.normalizePath(item.filename), // Return relative path as ID
                    name: item.basename,
                    updated_at: item.lastmod
                }))
        } catch (e) {
            console.error('List projects failed', e)
            throw new Error('Failed to list folders')
        }
    }

    async listFiles(project: string, _path: string = ''): Promise<FileItem[]> {
        const client = await this.getClient()
        
        // project is the root path (e.g. /Photos)
        // _path is relative to project
        
        // However, since we normalized project ID to be relative to root (e.g. /Photos), 
        // we can just join them.
        // If project is '/' and path is 'img.jpg', target is '/img.jpg'
        
        // Ensure paths start with /
        const root = project.startsWith('/') ? project : '/' + project
        const sub = _path ? (_path.startsWith('/') ? _path : '/' + _path) : ''
        
        const targetPath = (root === '/' ? '' : root) + sub || '/'
        
        try {
            const contents = await client.getDirectoryContents(targetPath) as FileStat[]
            
            return contents.map((item) => {
                const type = item.type === 'directory' ? 'dir' : 'file'
                return {
                    path: this.normalizePath(item.filename), // Normalize for consistency
                    name: item.basename,
                    type
                }
            })
        } catch (e) {
             console.error('List files failed', e)
             return []
        }
    }

    async readFile(_project: string, path: string): Promise<string> {
        const client = await this.getClient()
        const items = await client.getFileContents(path, { format: 'text' })
        return items as string
    }

    async writeFile(_project: string, path: string, content: string, _message?: string): Promise<void> {
        const client = await this.getClient()
        await client.putFileContents(path, content)
    }

    async createNewFile(folderPath: string, name: string, content: string): Promise<string> {
        const client = await this.getClient()
        // Ensure folderPath doesn't end in slash to avoid double slash
        const apiPath = folderPath.replace(/\/$/, '') + '/' + name
        await client.putFileContents(apiPath, content)
        return apiPath
    }

    async deleteFile(_project: string, path: string): Promise<void> {
        const client = await this.getClient()
        await client.deleteFile(path)
    }

    async createFolder(project: string, name: string): Promise<void> {
        const client = await this.getClient()
        // project here might be the parent folder path
        const newPath = project.replace(/\/$/, '') + '/' + name
        await client.createDirectory(newPath)
    }

    async renameFile(_project: string, oldPath: string, newPath: string): Promise<void> {
        const client = await this.getClient()
        // WebDAV MOVE
        await client.moveFile(oldPath, newPath)
    }
}
