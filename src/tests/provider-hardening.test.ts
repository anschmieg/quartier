import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ProviderError,
  ResponseSizeGuard,
  classifyProviderResponse,
  normalizeProviderError,
  sanitizeProviderLogValue,
  withRequestTimeout,
} from '@/services/providerHardening'
import {
  constantTimeTokenEqual,
  createStateToken,
  validateStateToken,
} from '@/utils/csrf'

describe('provider error normalization', () => {
  it('preserves stable typed codes without exposing provider details', () => {
    const secret = 'provider-debug-token'
    const normalized = normalizeProviderError(new ProviderError('rate-limited', {
      message: `GitHub rejected ${secret}`,
      retryAfterMs: 4_000,
    }))

    expect(normalized).toEqual({
      code: 'rate-limited',
      message: 'The remote provider is temporarily limiting requests.',
      retryable: true,
      retryAfterMs: 4_000,
    })
    expect(JSON.stringify(normalized)).not.toContain(secret)
  })

  it('maps unknown thrown values to a non-retryable safe error', () => {
    expect(normalizeProviderError(new Error('response body with private data'))).toEqual({
      code: 'unknown',
      message: 'The remote operation could not be completed.',
      retryable: false,
    })
  })
})

describe('provider request guards', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('rejects an operation with a typed timeout error and aborts its signal', async () => {
    vi.useFakeTimers()
    let operationSignal: AbortSignal | undefined
    const result = withRequestTimeout(
      signal => new Promise<string>(() => {
        operationSignal = signal
      }),
      { timeoutMs: 250 },
    )
    const rejection = expect(result).rejects.toMatchObject({
      code: 'timeout',
      retryable: true,
    })

    await vi.advanceTimersByTimeAsync(250)

    await rejection
    expect(operationSignal?.aborted).toBe(true)
  })

  it('tracks streamed bytes and rejects declared or accumulated oversized responses', () => {
    const guard = new ResponseSizeGuard(10)

    guard.assertContentLength('10')
    expect(guard.addChunk(4)).toBe(4)
    expect(guard.addChunk(6)).toBe(10)
    expect(() => guard.addChunk(1)).toThrowError(
      expect.objectContaining({ code: 'response-too-large' }),
    )

    expect(() => new ResponseSizeGuard(10).assertContentLength('11')).toThrowError(
      expect.objectContaining({ code: 'response-too-large' }),
    )
  })
})

describe('rate-limit and retry classification', () => {
  const now = Date.parse('2026-06-06T12:00:00.000Z')

  it('classifies rate limits with numeric and date retry hints', () => {
    expect(classifyProviderResponse(429, { 'Retry-After': '3' }, now)).toEqual({
      code: 'rate-limited',
      retryable: true,
      retryAfterMs: 3_000,
    })
    expect(classifyProviderResponse(
      429,
      { 'retry-after': 'Sat, 06 Jun 2026 12:00:05 GMT' },
      now,
    )).toEqual({
      code: 'rate-limited',
      retryable: true,
      retryAfterMs: 5_000,
    })
  })

  it('retries transient server failures but not authorization or conflicts', () => {
    expect(classifyProviderResponse(503)).toEqual({
      code: 'service-unavailable',
      retryable: true,
    })
    expect(classifyProviderResponse(403)).toEqual({
      code: 'authorization-denied',
      retryable: false,
    })
    expect(classifyProviderResponse(412)).toEqual({
      code: 'conflict',
      retryable: false,
    })
  })
})

describe('provider log redaction', () => {
  it('redacts sensitive fields and token-like values recursively', () => {
    const source = '# Confidential analysis\nprivate results'
    const accessToken = 'gho_example-secret-token'
    const cookie = 'session=private-cookie'
    const sanitized = sanitizeProviderLogValue({
      providerId: 'github',
      document: {
        id: 'document-1',
        source,
      },
      request: {
        headers: {
          authorization: `Bearer ${accessToken}`,
          cookie,
        },
        url: `https://provider.invalid/callback?code=${accessToken}&state=${accessToken}`,
      },
      accessToken,
    })
    const output = JSON.stringify(sanitized)

    expect(output).toContain('github')
    expect(output).toContain('document-1')
    expect(output).toContain('[REDACTED]')
    expect(output).not.toContain(source)
    expect(output).not.toContain(accessToken)
    expect(output).not.toContain(cookie)
  })

  it('redacts bearer credentials embedded in otherwise safe error messages', () => {
    const token = 'token-value-123'
    const output = JSON.stringify(sanitizeProviderLogValue(
      new Error(`Request failed with Bearer ${token}`),
    ))

    expect(output).not.toContain(token)
    expect(output).toContain('Bearer [REDACTED]')
  })
})

describe('CSRF and OAuth state-token primitives', () => {
  it('creates URL-safe random tokens without embedding secrets', () => {
    const first = createStateToken()
    const second = createStateToken()

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(second).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(first).not.toBe(second)
  })

  it('compares token values without an early length return', () => {
    const token = createStateToken()

    expect(constantTimeTokenEqual(token, token)).toBe(true)
    expect(constantTimeTokenEqual(token, `${token.slice(0, -1)}x`)).toBe(false)
    expect(constantTimeTokenEqual(token, `${token}x`)).toBe(false)
  })

  it('returns a field-safe validation result for every token state', () => {
    const token = createStateToken()
    const otherToken = createStateToken()

    expect(validateStateToken(token, token)).toEqual({ valid: true, code: 'valid' })
    expect(validateStateToken(token, undefined)).toEqual({ valid: false, code: 'missing' })
    expect(validateStateToken(token, 'not valid')).toEqual({
      valid: false,
      code: 'malformed',
    })
    expect(validateStateToken(token, otherToken)).toEqual({
      valid: false,
      code: 'mismatch',
    })
  })
})
