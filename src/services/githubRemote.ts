import type {
  DeferredRemoteAction,
  RemoteProviderClient,
  RemoteProviderDescriptor,
} from '@/services/remoteConnection'
import {
  isValidSameOriginReturnPath,
  validateGitHubRepositoryInput,
  type GitHubRepositoryInput,
} from '@/services/remoteValidation'

export interface GitHubConnectInput {
  returnPath: string
}

export interface GitHubImportInput extends GitHubRepositoryInput {
  ref?: string
}

export interface GitHubSyncInput extends GitHubImportInput {
  source: string
  title: string
  expectedRevision?: string
}

export interface GitHubDisconnectInput {
  retainLocalDocuments: true
}

export const githubRemoteProvider: RemoteProviderDescriptor = Object.freeze({
  id: 'github',
  name: 'GitHub',
  description: 'Import and sync an explicitly selected Quarto document.',
  capabilities: Object.freeze(['connect', 'import', 'sync', 'disconnect'] as const),
  availability: 'scaffolded',
})

const DEFERRED_MESSAGE =
  'GitHub connection is scaffolded, but live OAuth and API access are deferred.'

function deferred(): DeferredRemoteAction {
  return {
    status: 'deferred',
    message: DEFERRED_MESSAGE,
  }
}

function assertRepositoryInput(input: GitHubRepositoryInput): void {
  const validation = validateGitHubRepositoryInput(input)
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '))
  }
}

export const githubRemoteClient: RemoteProviderClient<
  GitHubConnectInput,
  GitHubImportInput,
  GitHubSyncInput,
  GitHubDisconnectInput
> = {
  async connect(input) {
    if (!isValidSameOriginReturnPath(input.returnPath)) {
      throw new Error('GitHub return path must be a same-origin application path.')
    }
    return deferred()
  },

  async importDocument(input) {
    assertRepositoryInput(input)
    return deferred()
  },

  async syncDocument(input) {
    assertRepositoryInput(input)
    return deferred()
  },

  async disconnect(input) {
    if (input.retainLocalDocuments !== true) {
      throw new Error('Disconnect must retain local documents.')
    }
    return deferred()
  },
}
