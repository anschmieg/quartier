import { describe, expect, it, vi } from 'vitest'
import {
  githubRemoteClient,
  githubRemoteProvider,
} from '@/services/githubRemote'
import { createDisconnectedConnection } from '@/services/remoteConnection'
import {
  isValidGitHubDocumentPath,
  isValidGitHubOwner,
  isValidGitHubRepository,
  isValidSameOriginReturnPath,
  validateGitHubRepositoryInput,
} from '@/services/remoteValidation'

describe('remote provider descriptors', () => {
  it('describes GitHub without selecting or connecting it', () => {
    expect(githubRemoteProvider).toEqual({
      id: 'github',
      name: 'GitHub',
      description: 'Import and sync an explicitly selected Quarto document.',
      capabilities: ['connect', 'import', 'sync', 'disconnect'],
      availability: 'scaffolded',
    })
    expect(createDisconnectedConnection(githubRemoteProvider)).toEqual({
      providerId: 'github',
      status: 'disconnected',
    })
    expect(Object.isFrozen(githubRemoteProvider)).toBe(true)
    expect(Object.isFrozen(githubRemoteProvider.capabilities)).toBe(true)
  })
})

describe('same-origin return path validation', () => {
  it.each([
    '/',
    '/documents',
    '/documents/active?source=github#remote-storage',
  ])('accepts %s', (path) => {
    expect(isValidSameOriginReturnPath(path)).toBe(true)
  })

  it.each([
    '',
    'documents',
    'https://example.com/documents',
    '//example.com/documents',
    '/%2Fexample.com/documents',
    '/%252Fexample.com/documents',
    '/\\example.com/documents',
    '/%5Cexample.com/documents',
    '/documents\nSet-Cookie: bad',
    '/documents%0ASet-Cookie:%20bad',
    '/documents%',
  ])('rejects %s', (path) => {
    expect(isValidSameOriginReturnPath(path)).toBe(false)
  })
})

describe('GitHub input validation', () => {
  it.each(['quartier', 'openai', 'team-name', 'A1'])(
    'accepts owner %s',
    (owner) => {
      expect(isValidGitHubOwner(owner)).toBe(true)
    },
  )

  it.each(['-team', 'team-', 'team_name', 'team/name', ''])(
    'rejects owner %s',
    (owner) => {
      expect(isValidGitHubOwner(owner)).toBe(false)
    },
  )

  it.each(['quartier', 'quartier.dev', '.github', 'docs_repo'])(
    'accepts repository %s',
    (repository) => {
      expect(isValidGitHubRepository(repository)).toBe(true)
    },
  )

  it.each(['', '.', '..', 'owner/repository', 'repository name'])(
    'rejects repository %s',
    (repository) => {
      expect(isValidGitHubRepository(repository)).toBe(false)
    },
  )

  it.each(['document.qmd', 'reports/2026/results.QMD'])(
    'accepts document path %s',
    (path) => {
      expect(isValidGitHubDocumentPath(path)).toBe(true)
    },
  )

  it.each([
    '',
    '/document.qmd',
    '../document.qmd',
    '%2E%2E/document.qmd',
    '%252E%252E/document.qmd',
    'reports//document.qmd',
    'reports/./document.qmd',
    'reports\\document.qmd',
    'reports%5Cdocument.qmd',
    'document.md',
  ])('rejects document path %s', (path) => {
    expect(isValidGitHubDocumentPath(path)).toBe(false)
  })

  it('returns field-safe errors for an invalid repository input', () => {
    expect(validateGitHubRepositoryInput({
      owner: '-bad',
      repository: 'bad/repository',
      path: '../document.md',
    })).toEqual({
      valid: false,
      errors: [
        'Enter a valid GitHub owner.',
        'Enter a valid GitHub repository name.',
        'Enter a relative path to a .qmd file.',
      ],
    })
  })
})

describe('GitHub remote client scaffold', () => {
  it('does not call the network when explicitly invoked', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)

    await expect(githubRemoteClient.connect({ returnPath: '/' })).resolves.toEqual({
      status: 'deferred',
      message: 'GitHub connection is scaffolded, but live OAuth and API access are deferred.',
    })
    await expect(githubRemoteClient.importDocument({
      owner: 'quartier',
      repository: 'quartier',
      path: 'README.qmd',
    })).resolves.toMatchObject({ status: 'deferred' })
    await expect(githubRemoteClient.syncDocument({
      owner: 'quartier',
      repository: 'quartier',
      path: 'README.qmd',
      title: 'README',
      source: '# Quartier',
    })).resolves.toMatchObject({ status: 'deferred' })
    await expect(githubRemoteClient.disconnect({
      retainLocalDocuments: true,
    })).resolves.toMatchObject({ status: 'deferred' })

    expect(fetch).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('validates inputs before returning the deferred result', async () => {
    await expect(githubRemoteClient.connect({
      returnPath: 'https://example.com',
    })).rejects.toThrow('same-origin application path')
    await expect(githubRemoteClient.importDocument({
      owner: 'quartier',
      repository: 'quartier',
      path: '../README.md',
    })).rejects.toThrow('relative path to a .qmd file')
  })
})
