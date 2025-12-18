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
        
        this.client = createClient(this.credentials.url, {
            username: this.credentials.username,
            password: this.credentials.password
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

        // Verify connection before saving
        const { createClient } = await import('webdav')
        const testClient = createClient(options.url, {
            username: options.username,
            password: options.password
        })

        try {
            await testClient.getDirectoryContents('/')
        } catch (e) {
            console.error('Connection failed:', e)
            throw new Error('Failed to connect to Nextcloud. Check URL and credentials.')
        }

        // Save
        this.credentials = {
            url: options.url,
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

    async listProjects(folderPath?: string): Promise<any[]> {
        // "Projects" in WebDAV are just folders.
        // We list contents of the given folder path, filtering for directories.
        const client = await this.getClient()
        const path = folderPath || '/'
        
        try {
            const contents = await client.getDirectoryContents(path) as FileStat[]
            
            // Filter only directories
            return contents
                .filter((item) => item.type === 'directory')
                .map((item) => ({
                    id: item.filename, // In webdav lib, filename is the full path
                    name: item.basename,
                    updated_at: item.lastmod
                }))
        } catch (e) {
            console.error('List projects failed', e)
            throw new Error('Failed to list folders')
        }
    }

    async listFiles(project: string, _path: string = ''): Promise<FileItem[]> {
        // project is the Root Path (e.g. /Photos) or the current folder context
        // _path is the current subfolder relative to project, logic similar to GDrive
        
        const client = await this.getClient()
        
        // Construct target path to list
        // If _path is provided, it's the full path we want to list (since listProjects returns full path as ID)
        // If not, use project as root
        const targetPath = _path || project
        
        try {
            const contents = await client.getDirectoryContents(targetPath) as FileStat[]
            
            return contents.map((item) => {
                // Determine type
                const type = item.type === 'directory' ? 'dir' : 'file'
                
                // For FileTree compatibility:
                // name: explicit basename
                // path: webdav returns full path in 'filename'.
                // Since our FileTree is recursive, we can just use the full path as the ID/path.
                // UNLESS FileTree expects relative paths? 
                // GDrive provider constructs 'parent/id'.
                // Here 'filename' is '/Photos/Summer/img.jpg'. This IS hierarchical.
                // So we can use it directly.
                
                return {
                    path: item.filename,
                    name: item.basename,
                    type
                }
            })
        } catch (e) {
             console.error('List files failed', e)
             // If file not found or other error, return empty
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
