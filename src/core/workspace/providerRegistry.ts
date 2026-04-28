import type { WorkspaceProvider } from './types'
import { GitHubProvider } from '@/services/providers/GitHubProvider'
import { LocalProvider } from '@/services/providers/LocalProvider'
import { GoogleDriveProvider } from '@/services/providers/GoogleDriveProvider'
import { NextcloudProvider } from '@/services/providers/NextcloudProvider'

class WorkspaceProviderRegistry {
  private readonly providers = new Map<string, WorkspaceProvider>()

  constructor() {
    this.register(new GitHubProvider())
    this.register(new LocalProvider())
    this.register(new GoogleDriveProvider())
    this.register(new NextcloudProvider())
  }

  register(provider: WorkspaceProvider) {
    this.providers.set(provider.id, provider)
  }

  get(providerId: string): WorkspaceProvider | undefined {
    return this.providers.get(providerId)
  }

  list(): WorkspaceProvider[] {
    return Array.from(this.providers.values())
  }
}

export const workspaceProviderRegistry = new WorkspaceProviderRegistry()
