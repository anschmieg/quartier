/**
 * Production GitHub service using our Backend Proxy
 * All requests go to /api/github/* to keep tokens secure
 */



/**
 * Production GitHub service using our Backend Proxy
 * All requests go to /api/github/* to keep tokens secure
 */
class ProxyGitHubService {

  async listRepos() {
    console.log('[ProxyGitHubService] Fetching repos...')
    try {
      const response = await fetch('/api/github/repos')
      console.log('[ProxyGitHubService] Response status:', response.status)

      if (!response.ok) {
        const text = await response.text()
        console.error('[ProxyGitHubService] Error body:', text)
        throw new Error(`Failed to fetch repos: ${response.status} ${response.statusText}`)
      }

      const text = await response.text()
      console.log('[ProxyGitHubService] Response body text length:', text.length)
      console.log('[ProxyGitHubService] Response body snippet:', text.substring(0, 100))

      const data = JSON.parse(text)
      console.log('[ProxyGitHubService] Repos loaded:', Array.isArray(data) ? data.length : data)
      return data
    } catch (e) {
      console.error('[ProxyGitHubService] listRepos error:', e)
      throw e
    }
  }

  /**
   * Get active session ID from localStorage if available
   */
  private getSessionParam(): string {
    try {
      const activeSession = localStorage.getItem('quartier:activeSession')
      if (activeSession) {
        const session = JSON.parse(activeSession)
        if (session.id) {
          return `&session=${encodeURIComponent(session.id)}`
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
    return ''
  }

  async loadRepo(owner: string, repo: string, path: string = '') {
    const sessionParam = this.getSessionParam()
    const url = `/api/github/content?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}${sessionParam}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to load repo: ${response.statusText}`)
    }
    return await response.json()
  }

  async readFile(owner: string, repo: string, path: string): Promise<string> {
    const sessionParam = this.getSessionParam()
    const url = `/api/github/content?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}${sessionParam}`
    console.log('[ProxyGitHubService] Reading file:', { owner, repo, path })

    try {
      const response = await fetch(url)

      if (!response.ok) {
        const text = await response.text()
        console.error('[ProxyGitHubService] readFile error:', text)
        throw new Error(`Failed to read file: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // GitHub API returns directory as array, file as object with 'content' field
      if (Array.isArray(data)) {
        throw new Error('Path is a directory, not a file')
      }

      if (!data.content) {
        throw new Error('No content field in response')
      }

      // Decode base64 content with proper UTF-8 handling
      const base64Content = data.content.replace(/\n/g, '') // Remove newlines from base64
      // atob() returns Latin-1, need to convert to UTF-8
      const binaryString = atob(base64Content)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const decoded = new TextDecoder('utf-8').decode(bytes)

      console.log('[ProxyGitHubService] File loaded, size:', decoded.length)
      return decoded
    } catch (e) {
      console.error('[ProxyGitHubService] readFile error:', e)
      throw e
    }
  }

  async commitChanges(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string
  ): Promise<{ success: boolean; commitSha?: string; fileSha?: string; error?: string }> {
    try {
      const response = await fetch('/api/github/commit', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo, path, content, message })
      })

      const result = await response.json() as {
        success?: boolean
        commitSha?: string
        fileSha?: string
        error?: string
      }

      if (!response.ok) {
        console.error('[ProxyGitHubService] Commit error:', result)
        return { success: false, error: result.error || 'Commit failed' }
      }

      console.log('[ProxyGitHubService] Committed:', path, 'SHA:', result.commitSha)
      return {
        success: true,
        commitSha: result.commitSha,
        fileSha: result.fileSha
      }
    } catch (e) {
      console.error('[ProxyGitHubService] commitChanges error:', e)
      return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
    }
  }

  /**
   * Create a new file
   */
  async createFile(
    owner: string,
    repo: string,
    path: string,
    content: string = '',
    message: string = `Create ${path}`
  ): Promise<{ success: boolean; error?: string }> {
    // Uses the commit endpoint which handles creation when no SHA exists
    const result = await this.commitChanges(owner, repo, path, content, message)
    return { success: result.success, error: result.error }
  }

  /**
   * Get file SHA (needed for delete/rename)
   */
  async getFileSha(owner: string, repo: string, path: string): Promise<string | null> {
    try {
      const sessionParam = this.getSessionParam()
      const url = `/api/github/content?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}${sessionParam}`
      const response = await fetch(url)
      if (!response.ok) return null
      const data = await response.json() as { sha?: string }
      return data.sha || null
    } catch {
      return null
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string = `Delete ${path}`
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const sha = await this.getFileSha(owner, repo, path)
      if (!sha) {
        return { success: false, error: 'File not found or unable to get SHA' }
      }

      const response = await fetch('/api/github/file', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo, path, message, sha })
      })

      const result = await response.json() as { success?: boolean; error?: string }
      if (!response.ok) {
        return { success: false, error: result.error || 'Delete failed' }
      }
      return { success: true }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
    }
  }

  /**
   * Rename a file (copy + delete)
   */
  async renameFile(
    owner: string,
    repo: string,
    oldPath: string,
    newPath: string,
    message: string = `Rename ${oldPath} to ${newPath}`
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Read existing file content
      const content = await this.readFile(owner, repo, oldPath)

      // Create new file
      const createResult = await this.createFile(owner, repo, newPath, content, message)
      if (!createResult.success) {
        return { success: false, error: createResult.error || 'Failed to create new file' }
      }

      // Delete old file
      const deleteResult = await this.deleteFile(owner, repo, oldPath, message)
      if (!deleteResult.success) {
        return { success: false, error: `Created new file but failed to delete old: ${deleteResult.error}` }
      }

      return { success: true }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
    }
  }

  async hasQuartierWorkflow(_owner: string, _repo: string): Promise<boolean> {
    // TODO: Implement check
    return false
  }

  async deployWorkflow(_owner: string, _repo: string): Promise<void> {
    // TODO: Implement deploy
  }

  async triggerWorkflow(_owner: string, _repo: string): Promise<void> {
    // TODO: Implement trigger
  }

  async getWorkflowStatus(_owner: string, _repo: string) {
    // TODO: Implement status
    return null
  }

  /**
   * List branches for a repository
   */
  async listBranches(owner: string, repo: string): Promise<{
    branches: { name: string; sha: string; protected: boolean; isDefault: boolean }[]
    defaultBranch: string
  }> {
    try {
      const url = `/api/github/branches?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
      const response = await fetch(url)

      if (!response.ok) {
        console.error('[ProxyGitHubService] Failed to fetch branches:', response.statusText)
        return { branches: [], defaultBranch: 'main' }
      }

      return await response.json()
    } catch (e) {
      console.error('[ProxyGitHubService] listBranches error:', e)
      return { branches: [], defaultBranch: 'main' }
    }
  }
}

// Use mock in development (if needed) or real service
// For now, let's enable real service even in DEV if the user wants real flow
// But the user needs the proxy to work.
export const githubService = new ProxyGitHubService()

