import { createStorage } from 'unstorage'
import localStorageDriver from 'unstorage/drivers/localstorage'

// Storage instance with localStorage for development
// In production, this would use cloudflare-kv-binding
export const storage = createStorage({
  driver: localStorageDriver({ base: 'quartier:' })
})

// Cache namespace for file content
const FILE_CACHE_PREFIX = 'file:'

/**
 * Cached file system that persists edits locally
 * Falls back to GitHub for initial load
 */
export const cachedFileSystem = {
  /**
   * Generate a cache key for a file
   */
  getCacheKey(owner: string, repo: string, path: string): string {
    return `${FILE_CACHE_PREFIX}${owner}/${repo}/${path}`
  },

  /**
   * Check if a file is cached locally
   */
  async hasCache(owner: string, repo: string, path: string): Promise<boolean> {
    const key = this.getCacheKey(owner, repo, path)
    return await storage.hasItem(key)
  },

  /**
   * Get cached content for a file
   */
  async getCache(owner: string, repo: string, path: string): Promise<string | null> {
    const key = this.getCacheKey(owner, repo, path)
    const val = await storage.getItem(key)
    if (val === null || val === undefined) return null
    if (typeof val === 'object') {
      return JSON.stringify(val, null, 2)
    }
    return String(val)
  },

  /**
   * Save content to local cache
   */
  async setCache(owner: string, repo: string, path: string, content: string): Promise<void> {
    const key = this.getCacheKey(owner, repo, path)
    await storage.setItem(key, content)
    console.log('[cachedFileSystem] Saved to cache:', key)
  },

  /**
   * Clear cached content for a file
   */
  async clearCache(owner: string, repo: string, path: string): Promise<void> {
    const key = this.getCacheKey(owner, repo, path)
    await storage.removeItem(key)
  },

  /**
   * List all cached files for a repo
   */
  async listCachedFiles(owner: string, repo: string): Promise<string[]> {
    const prefix = `${FILE_CACHE_PREFIX}${owner}/${repo}/`
    const keys = await storage.getKeys(prefix)
    return keys.map(k => k.replace(prefix, ''))
  }
}

/**
 * KV Sync service - syncs edits to Cloudflare KV for server-side persistence
 * Only works in production (Cloudflare Access required)
 */
const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')

export const kvSync = {
  /**
   * Get file content from KV
   */
  async get(owner: string, repo: string, path: string): Promise<{
    content: string
    user: string
    timestamp: number
    yjsState?: string
  } | null> {
    // Skip on localhost - no Cloudflare Access
    if (!isProduction) return null

    try {
      const response = await fetch(`/api/sync/${owner}/${repo}/${path}`, {
        credentials: 'include'
      })
      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error(`KV sync GET failed: ${response.status}`)
      }
      const data = await response.json()
      // Ensure content is a string (handle .ipynb parsed as JSON)
      if (data && typeof data.content === 'object') {
        data.content = JSON.stringify(data.content, null, 2)
      }
      return data
    } catch (error) {
      console.error('[kvSync] GET error:', error)
      return null
    }
  },

  /**
   * List files from KV (for guests)
   */
  async list(owner: string, repo: string): Promise<Array<{ path: string, type: string }> | null> {
    if (!isProduction) return null
    try {
      const response = await fetch(`/api/sync/${owner}/${repo}`, {
        credentials: 'include'
      })
      if (!response.ok) return null
      return await response.json()
    } catch (e) {
      console.error('[kvSync] LIST error:', e)
      return null
    }
  },

  /**
   * Save file content to KV (with optional Yjs state for conflict-free sync)
   */
  async put(
    owner: string,
    repo: string,
    path: string,
    content: string,
    sha?: string,
    yjsState?: string
  ): Promise<boolean> {
    // Skip on localhost - no Cloudflare Access
    if (!isProduction) return false

    try {
      const response = await fetch(`/api/sync/${owner}/${repo}/${path}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, sha, yjsState })
      })
      if (!response.ok) {
        throw new Error(`KV sync PUT failed: ${response.status}`)
      }
      console.log('[kvSync] Saved to KV:', `${owner}/${repo}/${path}`)
      return true
    } catch (error) {
      console.error('[kvSync] PUT error:', error)
      return false
    }
  },

  /**
   * Delete file from KV
   */
  async delete(owner: string, repo: string, path: string): Promise<boolean> {
    // Skip on localhost - no Cloudflare Access
    if (!isProduction) return false

    try {
      const response = await fetch(`/api/sync/${owner}/${repo}/${path}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error(`KV sync DELETE failed: ${response.status}`)
      }
      return true
    } catch (error) {
      console.error('[kvSync] DELETE error:', error)
      return false
    }
  }
}

// Legacy mock file system (for backwards compatibility)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const fileSystem = {
  async listFiles() {
    const keys = await storage.getKeys()
    if (keys.length === 0) {
      await this.saveFile('index.qmd', '# Welcome to Quartier\n\nA home for your research. Start editing to begin.')
      await this.saveFile('analysis.py', 'print("Hello World")')
      return ['index.qmd', 'analysis.py']
    }
    return keys
  },

  async readFile(filename: string) {
    await delay(100)
    return await storage.getItem(filename) as string
  },

  async saveFile(filename: string, content: string) {
    await delay(100)
    await storage.setItem(filename, content)
  },

  async deleteFile(filename: string) {
    await delay(100)
    await storage.removeItem(filename)
  }
}

