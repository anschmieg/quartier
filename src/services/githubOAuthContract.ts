import {
  ProviderError,
  normalizeProviderError,
  type SafeProviderError,
} from './providerHardening'
import { isValidSameOriginReturnPath } from './remoteValidation'
import { createStateToken, validateStateToken } from '../utils/csrf'

export const GITHUB_OAUTH_ROUTES = Object.freeze({
  connect: { method: 'POST', path: '/api/github/oauth/connect' },
  callback: { method: 'GET', path: '/api/github/oauth/callback' },
  me: { method: 'GET', path: '/api/github/oauth/me' },
  disconnect: { method: 'POST', path: '/api/github/oauth/disconnect' },
} as const)

export type GitHubOAuthRouteName = keyof typeof GITHUB_OAUTH_ROUTES

export interface GitHubOAuthConnectRequest {
  returnTo: string
}

export interface GitHubOAuthCallbackQuery {
  code: string
  state: string
}

export interface GitHubOAuthAccount {
  login: string
  name?: string
  avatarUrl?: string
}

export interface GitHubOAuthSession {
  providerId: 'github'
  status: 'disconnected' | 'connected'
  account: GitHubOAuthAccount | null
}

export interface GitHubOAuthStateRecord {
  state: string
  returnTo: string
  createdAt: number
  expiresAt: number
}

/**
 * Implementations must remove and return a state record atomically from
 * server-side storage. A second take for the same state must return undefined.
 */
export interface GitHubOAuthStateStore {
  put(record: GitHubOAuthStateRecord): Promise<void>
  take(state: string): Promise<GitHubOAuthStateRecord | undefined>
}

export type GitHubOAuthContractResult<T> =
  | { ok: true, value: T }
  | { ok: false, error: SafeProviderError }

const DEFAULT_STATE_TTL_MS = 10 * 60 * 1000
const MAXIMUM_STATE_TTL_MS = 15 * 60 * 1000
const STATE_PATTERN = /^[A-Za-z0-9_-]{22,172}$/

function isCallbackValueValid(value: string): boolean {
  return value.length > 0 && !Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint <= 31 || codePoint === 127
  })
}

function invalidRequest(): GitHubOAuthContractResult<never> {
  return {
    ok: false,
    error: normalizeProviderError(new ProviderError('invalid-request')),
  }
}

function authorizationDenied(): GitHubOAuthContractResult<never> {
  return {
    ok: false,
    error: normalizeProviderError(new ProviderError('authorization-denied')),
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseGitHubOAuthConnectRequest(
  input: unknown,
): GitHubOAuthContractResult<GitHubOAuthConnectRequest> {
  if (!isRecord(input)
    || Object.keys(input).length !== 1
    || typeof input.returnTo !== 'string'
    || !isValidSameOriginReturnPath(input.returnTo)) {
    return invalidRequest()
  }

  return {
    ok: true,
    value: { returnTo: input.returnTo },
  }
}

export function parseGitHubOAuthCallbackQuery(
  query: URLSearchParams,
): GitHubOAuthContractResult<GitHubOAuthCallbackQuery> {
  if (query.has('error')) {
    return authorizationDenied()
  }

  const codes = query.getAll('code')
  const states = query.getAll('state')
  const code = codes[0]
  const state = states[0]
  if (!code
    || codes.length !== 1
    || code.length > 512
    || !isCallbackValueValid(code)
    || !state
    || states.length !== 1
    || !STATE_PATTERN.test(state)) {
    return invalidRequest()
  }

  return {
    ok: true,
    value: { code, state },
  }
}

export function createGitHubOAuthStateRecord(
  returnTo: string,
  nowMs = Date.now(),
  ttlMs = DEFAULT_STATE_TTL_MS,
): GitHubOAuthStateRecord {
  if (!isValidSameOriginReturnPath(returnTo)
    || !Number.isSafeInteger(nowMs)
    || !Number.isSafeInteger(ttlMs)
    || ttlMs <= 0
    || ttlMs > MAXIMUM_STATE_TTL_MS
    || !Number.isSafeInteger(nowMs + ttlMs)) {
    throw new ProviderError('invalid-request')
  }

  return {
    state: createStateToken(),
    returnTo,
    createdAt: nowMs,
    expiresAt: nowMs + ttlMs,
  }
}

export function validateGitHubOAuthStateRecord(
  record: GitHubOAuthStateRecord | undefined,
  providedState: string | null | undefined,
  nowMs = Date.now(),
): GitHubOAuthContractResult<{ returnTo: string }> {
  if (!record
    || !Number.isSafeInteger(nowMs)
    || !Number.isSafeInteger(record.createdAt)
    || !Number.isSafeInteger(record.expiresAt)
    || record.expiresAt <= record.createdAt
    || nowMs < record.createdAt
    || nowMs >= record.expiresAt
    || !isValidSameOriginReturnPath(record.returnTo)
    || !validateStateToken(record.state, providedState).valid) {
    return authorizationDenied()
  }

  return {
    ok: true,
    value: { returnTo: record.returnTo },
  }
}

export function createDisconnectedGitHubOAuthSession(): GitHubOAuthSession {
  return {
    providerId: 'github',
    status: 'disconnected',
    account: null,
  }
}
