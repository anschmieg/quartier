import type { WorkspaceProvider } from './types'
import { LocalProvider } from '@/services/providers/LocalProvider'

class WorkspaceProviderRegistry {
  private readonly providers = new Map<string, WorkspaceProvider>()

  constructor() {
    this.register(new LocalProvider())
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
