// Octokit kept for production implementation
import { Octokit as _Octokit } from 'octokit'

// Workflow template path (bundled with app)
const WORKFLOW_TEMPLATE_PATH = '/src/assets/workflows/quartier.yml'

// Mock implementation for the sandbox
class MockGitHubService {
  async loadRepo(owner: string, repo: string) {
    console.log(`[Mock] Loading repo ${owner}/${repo}`)
    return [
      { name: 'index.qmd', type: 'file', path: 'index.qmd' },
      { name: 'scripts', type: 'dir', path: 'scripts' }
    ]
  }

  async readFile(owner: string, repo: string, path: string) {
    console.log(`[Mock] Reading file ${path} from ${owner}/${repo}`)
    return "# Mock Content\n\nThis is content fetched from GitHub."
  }

  async commitChanges(owner: string, repo: string, path: string, content: string, message: string) {
    console.log(`[Mock] Committing to ${owner}/${repo}/${path}`)
    console.log(`Message: ${message}`)
    console.log(`Content Preview: ${content.substring(0, 50)}...`)
    return { status: 200, data: { commit: { sha: 'mock-sha' } } }
  }

  /**
   * Check if Quartier workflow is installed in the repo
   */
  async hasQuartierWorkflow(owner: string, repo: string): Promise<boolean> {
    console.log(`[Mock] Checking workflow in ${owner}/${repo}`)
    return false
  }

  /**
   * Deploy the Quartier workflow to a repository
   */
  async deployWorkflow(owner: string, repo: string): Promise<void> {
    console.log(`[Mock] Deploying workflow to ${owner}/${repo}`)
    console.log(`Would create .github/workflows/quartier.yml`)
  }

  /**
   * Trigger a workflow run (manual dispatch)
   */
  async triggerWorkflow(owner: string, repo: string): Promise<void> {
    console.log(`[Mock] Triggering workflow in ${owner}/${repo}`)
  }

  /**
   * Get the latest workflow run status
   */
  async getWorkflowStatus(owner: string, repo: string): Promise<{
    status: 'queued' | 'in_progress' | 'completed'
    conclusion?: 'success' | 'failure' | 'cancelled'
    url?: string
  } | null> {
    console.log(`[Mock] Getting workflow status for ${owner}/${repo}`)
    return null
  }
}

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

  async loadRepo(owner: string, repo: string) {
    // TODO: Implement /api/github/content endpoint
    console.warn('loadRepo via proxy not implemented yet')
    return []
  }

  async readFile(owner: string, repo: string, path: string) {
    // TODO: Implement /api/github/content endpoint
    console.warn('readFile via proxy not implemented yet')
    return ""
  }

  async commitChanges(owner: string, repo: string, path: string, content: string, message: string) {
    // TODO: Implement /api/github/commit endpoint
    console.warn('commitChanges via proxy not implemented yet')
    return {}
  }

  async hasQuartierWorkflow(owner: string, repo: string): Promise<boolean> {
    // TODO: Implement check
    return false
  }

  async deployWorkflow(owner: string, repo: string): Promise<void> {
    // TODO: Implement deploy
  }

  async triggerWorkflow(owner: string, repo: string): Promise<void> {
    // TODO: Implement trigger
  }

  async getWorkflowStatus(owner: string, repo: string) {
    // TODO: Implement status
    return null
  }
}

// Use mock in development (if needed) or real service
// For now, let's enable real service even in DEV if the user wants real flow
// But the user needs the proxy to work.
export const githubService = new ProxyGitHubService()

