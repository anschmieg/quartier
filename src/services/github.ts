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
 * Production GitHub service using Octokit
 * Uses cookie-based auth via our OAuth proxy
 */
class OctokitGitHubService {
  private octokit: InstanceType<typeof _Octokit> | null = null

  private async getOctokit(): Promise<InstanceType<typeof _Octokit>> {
    if (!this.octokit) {
      // In production, the token is stored in HttpOnly cookie
      // We make authenticated requests through our API proxy
      // For now, throw if no token
      throw new Error('Not authenticated')
    }
    return this.octokit
  }

  async loadRepo(owner: string, repo: string) {
    const octokit = await this.getOctokit()
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: '',
    })
    return Array.isArray(data) ? data : [data]
  }

  async readFile(owner: string, repo: string, path: string) {
    const octokit = await this.getOctokit()
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    })

    if ('content' in data && data.encoding === 'base64') {
      return atob(data.content)
    }
    throw new Error('Unable to read file content')
  }

  async commitChanges(owner: string, repo: string, path: string, content: string, message: string) {
    const octokit = await this.getOctokit()

    // Get the current file SHA (if exists)
    let sha: string | undefined
    try {
      const { data } = await octokit.rest.repos.getContent({ owner, repo, path })
      if ('sha' in data) {
        sha = data.sha
      }
    } catch {
      // File doesn't exist, that's okay
    }

    return await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: btoa(content),
      sha,
    })
  }

  async hasQuartierWorkflow(owner: string, repo: string): Promise<boolean> {
    try {
      await this.readFile(owner, repo, '.github/workflows/quartier.yml')
      return true
    } catch {
      return false
    }
  }

  async deployWorkflow(owner: string, repo: string): Promise<void> {
    // Fetch the workflow template
    const response = await fetch(WORKFLOW_TEMPLATE_PATH)
    const workflowContent = await response.text()

    await this.commitChanges(
      owner,
      repo,
      '.github/workflows/quartier.yml',
      workflowContent,
      'Add Quartier workflow for Quarto rendering'
    )
  }

  async triggerWorkflow(owner: string, repo: string): Promise<void> {
    const octokit = await this.getOctokit()

    await octokit.rest.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id: 'quartier.yml',
      ref: 'main',
    })
  }

  async getWorkflowStatus(owner: string, repo: string) {
    const octokit = await this.getOctokit()

    const { data } = await octokit.rest.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: 'quartier.yml',
      per_page: 1,
    })

    if (data.workflow_runs.length === 0) {
      return null
    }

    const run = data.workflow_runs[0]
    if (!run) {
      return null
    }

    return {
      status: run.status as 'queued' | 'in_progress' | 'completed',
      conclusion: run.conclusion as 'success' | 'failure' | 'cancelled' | undefined,
      url: run.html_url,
    }
  }
}

// Use mock in development, real service in production
export const githubService = import.meta.env.DEV
  ? new MockGitHubService()
  : new OctokitGitHubService()
