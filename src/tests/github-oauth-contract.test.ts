import { describe, expect, it, vi } from 'vitest'
import {
  GITHUB_OAUTH_ROUTES,
  createDisconnectedGitHubOAuthSession,
  createGitHubOAuthStateRecord,
  parseGitHubOAuthCallbackQuery,
  parseGitHubOAuthConnectRequest,
  validateGitHubOAuthStateRecord,
  type GitHubOAuthStateStore,
} from '@/services/githubOAuthContract'

describe('GitHub OAuth route contracts', () => {
  it('defines only the explicit connect, callback, me, and disconnect routes', () => {
    expect(GITHUB_OAUTH_ROUTES).toEqual({
      connect: { method: 'POST', path: '/api/github/oauth/connect' },
      callback: { method: 'GET', path: '/api/github/oauth/callback' },
      me: { method: 'GET', path: '/api/github/oauth/me' },
      disconnect: { method: 'POST', path: '/api/github/oauth/disconnect' },
    })
  })

  it('accepts a same-origin return path and rejects external or malformed input', () => {
    expect(parseGitHubOAuthConnectRequest({
      returnTo: '/documents?remote=github',
    })).toEqual({
      ok: true,
      value: { returnTo: '/documents?remote=github' },
    })

    expect(parseGitHubOAuthConnectRequest({
      returnTo: 'https://attacker.invalid',
    })).toMatchObject({
      ok: false,
      error: { code: 'invalid-request', retryable: false },
    })
    expect(parseGitHubOAuthConnectRequest({
      returnTo: '%2f%2fattacker.invalid',
    })).toMatchObject({
      ok: false,
      error: { code: 'invalid-request', retryable: false },
    })
    expect(parseGitHubOAuthConnectRequest({
      returnTo: '/',
      token: 'must-not-be-accepted',
    })).toMatchObject({
      ok: false,
      error: { code: 'invalid-request', retryable: false },
    })
  })

  it('parses the callback fields without accepting provider error details', () => {
    expect(parseGitHubOAuthCallbackQuery(new URLSearchParams({
      code: 'temporary-code',
      state: 'valid_state-token-1234567890',
    }))).toEqual({
      ok: true,
      value: {
        code: 'temporary-code',
        state: 'valid_state-token-1234567890',
      },
    })

    const denied = parseGitHubOAuthCallbackQuery(new URLSearchParams({
      error: 'access_denied',
      error_description: 'private provider detail',
      state: 'valid_state-token-1234567890',
    }))
    expect(denied).toMatchObject({
      ok: false,
      error: { code: 'authorization-denied', retryable: false },
    })
    expect(JSON.stringify(denied)).not.toContain('private provider detail')

    expect(parseGitHubOAuthCallbackQuery(new URLSearchParams(
      'code=first&code=second&state=valid_state-token-1234567890',
    ))).toMatchObject({
      ok: false,
      error: { code: 'invalid-request', retryable: false },
    })
  })
})

describe('GitHub OAuth state contract', () => {
  const now = Date.parse('2026-06-06T12:00:00.000Z')

  it('creates a short-lived record suitable for server-side single-use storage', () => {
    const record = createGitHubOAuthStateRecord('/documents', now)

    expect(record.state).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(record.returnTo).toBe('/documents')
    expect(record.createdAt).toBe(now)
    expect(record.expiresAt).toBe(now + 10 * 60 * 1000)
  })

  it('validates a record once taken from a single-use state store', () => {
    const record = createGitHubOAuthStateRecord('/documents', now)

    expect(validateGitHubOAuthStateRecord(record, record.state, now + 1_000)).toEqual({
      ok: true,
      value: { returnTo: '/documents' },
    })
    expect(validateGitHubOAuthStateRecord(record, record.state, record.expiresAt)).toMatchObject({
      ok: false,
      error: { code: 'authorization-denied', retryable: false },
    })
    expect(validateGitHubOAuthStateRecord(record, 'different_state-token-123456', now)).toMatchObject({
      ok: false,
      error: { code: 'authorization-denied', retryable: false },
    })
    expect(validateGitHubOAuthStateRecord({
      ...record,
      expiresAt: Number.NaN,
    }, record.state, now)).toMatchObject({
      ok: false,
      error: { code: 'authorization-denied', retryable: false },
    })
  })

  it('requires stores to expose destructive take semantics', async () => {
    const records = new Map<string, ReturnType<typeof createGitHubOAuthStateRecord>>()
    const store: GitHubOAuthStateStore = {
      async put(record) {
        records.set(record.state, record)
      },
      async take(state) {
        const record = records.get(state)
        records.delete(state)
        return record
      },
    }
    const record = createGitHubOAuthStateRecord('/', now)

    await store.put(record)

    expect(await store.take(record.state)).toEqual(record)
    expect(await store.take(record.state)).toBeUndefined()
  })
})

describe('GitHub OAuth disconnected defaults', () => {
  it('returns no account or token and performs no network activity', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    expect(createDisconnectedGitHubOAuthSession()).toEqual({
      providerId: 'github',
      status: 'disconnected',
      account: null,
    })
    expect(fetchSpy).not.toHaveBeenCalled()

    fetchSpy.mockRestore()
  })
})
