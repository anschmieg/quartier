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

  async loadRepo(_owner: string, _repo: string) {
    // TODO: Implement /api/github/content endpoint
    console.warn('loadRepo via proxy not implemented yet')
    return []
  }

  async readFile(_owner: string, _repo: string, _path: string) {
    // TODO: Implement /api/github/content endpoint
    console.warn('readFile via proxy not implemented yet')
    return ""
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

