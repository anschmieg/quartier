import { describe, expect, it } from 'vitest'
import type { WorkspaceProvider } from '@/core/workspace/types'
import { registerRemoteStorage } from '@/features/remoteStorage'

describe('registerRemoteStorage', () => {
  it('registers only remote providers into each requested registry', () => {
    const workspaceProviders: string[] = []
    const legacyProviders: string[] = []

    registerRemoteStorage(
      { register: (provider: WorkspaceProvider) => workspaceProviders.push(provider.id) },
      { registerProvider: (provider: WorkspaceProvider) => legacyProviders.push(provider.id) },
    )

    expect(workspaceProviders).toEqual(['github', 'gdrive', 'nextcloud'])
    expect(legacyProviders).toEqual(['github', 'gdrive', 'nextcloud'])
  })
})
