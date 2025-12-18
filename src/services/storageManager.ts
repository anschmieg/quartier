import { useStorage } from '@vueuse/core'
import type { StorageProvider } from '../types/providers'
import { GitHubProvider } from './providers/GitHubProvider'
import { LocalProvider } from './providers/LocalProvider'
import { GoogleDriveProvider } from './providers/GoogleDriveProvider'
import { NextcloudProvider } from './providers/NextcloudProvider'

class StorageManager {
  private providers = new Map<string, StorageProvider>()
  
  // Persisted state
  private activeProviderId = useStorage<string>('quartier:activeProvider', 'github')
  private activeProjectId = useStorage<string | null>('quartier:activeProject', null)

  constructor() {
    this.registerProvider(new GitHubProvider())
    this.registerProvider(new LocalProvider())
    this.registerProvider(new GoogleDriveProvider())
    this.registerProvider(new NextcloudProvider())
    
    // Stubs
  }

  registerProvider(provider: StorageProvider) {
    this.providers.set(provider.id, provider)
  }

  get activeProvider(): StorageProvider {
    return this.providers.get(this.activeProviderId.value) || this.providers.get('github')!
  }

  get activeProject(): string | null {
    return this.activeProjectId.value
  }

  setSource(providerId: string, projectId: string | null) {
    this.activeProviderId.value = providerId
    this.activeProjectId.value = projectId
  }

  get allProviders() {
    return Array.from(this.providers.values())
  }
}

export const storageManager = new StorageManager()
