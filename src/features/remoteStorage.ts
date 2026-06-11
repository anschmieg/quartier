import type { WorkspaceProvider } from '@/core/workspace/types'
import { workspaceProviderRegistry } from '@/core/workspace/providerRegistry'
import { storageManager } from '@/services/storageManager'
import { GitHubProvider } from '@/services/providers/GitHubProvider'
import { GoogleDriveProvider } from '@/services/providers/GoogleDriveProvider'
import { NextcloudProvider } from '@/services/providers/NextcloudProvider'

interface WorkspaceProviderRegistrar {
  register(provider: WorkspaceProvider): void
}

interface LegacyProviderRegistrar {
  registerProvider(provider: WorkspaceProvider): void
}

export function registerRemoteStorage(
  workspaceRegistry: WorkspaceProviderRegistrar = workspaceProviderRegistry,
  legacyRegistry: LegacyProviderRegistrar = storageManager,
): void {
  const providers = [
    new GitHubProvider(),
    new GoogleDriveProvider(),
    new NextcloudProvider(),
  ]

  providers.forEach((provider) => {
    workspaceRegistry.register(provider)
    legacyRegistry.registerProvider(provider)
  })
}
