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

  async loadRepo(owner: string, repo: string, path: string = '') {
    const url = `/api/github/content?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to load repo: ${response.statusText}`)
    }
    return await response.json()
  }

  async readFile(owner: string, repo: string, path: string): Promise<string> {
    const url = `/api/github/content?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}`
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

  async commitChanges(_owner: string, _repo: string, _path: string, _content: string, _message: string) {
    // TODO: Implement /api/github/commit endpoint
    console.warn('commitChanges via proxy not implemented yet')
    return {}
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
}

// Use mock in development (if needed) or real service
// For now, let's enable real service even in DEV if the user wants real flow
// But the user needs the proxy to work.
export const githubService = new ProxyGitHubService()

