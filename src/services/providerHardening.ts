export const PROVIDER_ERROR_CODES = [
  'authentication-required',
  'authorization-denied',
  'conflict',
  'invalid-request',
  'not-found',
  'rate-limited',
  'response-too-large',
  'service-unavailable',
  'timeout',
  'unknown',
] as const

export type ProviderErrorCode = typeof PROVIDER_ERROR_CODES[number]

export interface SafeProviderError {
  code: ProviderErrorCode
  message: string
  retryable: boolean
  retryAfterMs?: number
}

const ERROR_MESSAGES: Readonly<Record<ProviderErrorCode, string>> = Object.freeze({
  'authentication-required': 'Reconnect the remote provider and try again.',
  'authorization-denied': 'The remote provider did not allow this operation.',
  conflict: 'The remote document changed. Review both versions before continuing.',
  'invalid-request': 'The remote request was not valid.',
  'not-found': 'The remote document could not be found.',
  'rate-limited': 'The remote provider is temporarily limiting requests.',
  'response-too-large': 'The remote provider response was too large.',
  'service-unavailable': 'The remote provider is temporarily unavailable.',
  timeout: 'The remote provider took too long to respond.',
  unknown: 'The remote operation could not be completed.',
})

const RETRYABLE_CODES = new Set<ProviderErrorCode>([
  'rate-limited',
  'service-unavailable',
  'timeout',
])

export class ProviderError extends Error {
  readonly cause?: unknown
  readonly code: ProviderErrorCode
  readonly retryable: boolean
  readonly retryAfterMs?: number

  constructor(
    code: ProviderErrorCode,
    options: {
      cause?: unknown
      message?: string
      retryable?: boolean
      retryAfterMs?: number
    } = {},
  ) {
    super(options.message ?? ERROR_MESSAGES[code])
    this.name = 'ProviderError'
    this.cause = options.cause
    this.code = code
    this.retryable = options.retryable ?? RETRYABLE_CODES.has(code)
    this.retryAfterMs = options.retryAfterMs
  }
}

export function normalizeProviderError(error: unknown): SafeProviderError {
  if (error instanceof ProviderError) {
    return {
      code: error.code,
      message: ERROR_MESSAGES[error.code],
      retryable: error.retryable,
      ...(error.retryAfterMs === undefined ? {} : { retryAfterMs: error.retryAfterMs }),
    }
  }

  return {
    code: 'unknown',
    message: ERROR_MESSAGES.unknown,
    retryable: false,
  }
}

export interface RequestTimeoutOptions {
  timeoutMs: number
  signal?: AbortSignal
}

export async function withRequestTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: RequestTimeoutOptions,
): Promise<T> {
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new ProviderError('invalid-request')
  }

  const controller = new AbortController()
  const abortFromParent = () => controller.abort(options.signal?.reason)
  options.signal?.addEventListener('abort', abortFromParent, { once: true })

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort()
      reject(new ProviderError('timeout'))
    }, options.timeoutMs)
  })

  try {
    if (options.signal?.aborted) {
      controller.abort(options.signal.reason)
      throw options.signal.reason
    }
    return await Promise.race([operation(controller.signal), timeout])
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
    options.signal?.removeEventListener('abort', abortFromParent)
  }
}

export class ResponseSizeGuard {
  readonly maximumBytes: number
  private receivedBytes = 0

  constructor(maximumBytes: number) {
    if (!Number.isSafeInteger(maximumBytes) || maximumBytes <= 0) {
      throw new ProviderError('invalid-request')
    }
    this.maximumBytes = maximumBytes
  }

  get bytesReceived(): number {
    return this.receivedBytes
  }

  addChunk(byteLength: number): number {
    if (!Number.isSafeInteger(byteLength) || byteLength < 0) {
      throw new ProviderError('invalid-request')
    }

    this.receivedBytes += byteLength
    if (this.receivedBytes > this.maximumBytes) {
      throw new ProviderError('response-too-large')
    }
    return this.receivedBytes
  }

  assertContentLength(contentLength: string | null | undefined): void {
    if (contentLength === null || contentLength === undefined || contentLength === '') {
      return
    }

    const parsed = Number(contentLength)
    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      throw new ProviderError('invalid-request')
    }
    if (parsed > this.maximumBytes) {
      throw new ProviderError('response-too-large')
    }
  }
}

export interface ProviderResponseClassification {
  code?: ProviderErrorCode
  retryable: boolean
  retryAfterMs?: number
}

function headerValue(
  headers: Headers | Readonly<Record<string, string | undefined>> | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined
  if (headers instanceof Headers) return headers.get(name) ?? undefined

  const match = Object.entries(headers)
    .find(([key]) => key.toLowerCase() === name.toLowerCase())
  return match?.[1]
}

export function parseRetryAfter(
  value: string | undefined,
  nowMs: number,
): number | undefined {
  if (!value) return undefined

  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds * 1000)
  }

  const dateMs = Date.parse(value)
  if (Number.isNaN(dateMs)) return undefined
  return Math.max(0, dateMs - nowMs)
}

export function classifyProviderResponse(
  status: number,
  headers?: Headers | Readonly<Record<string, string | undefined>>,
  nowMs = Date.now(),
): ProviderResponseClassification {
  if (status >= 200 && status < 400) {
    return { retryable: false }
  }

  const retryAfterMs = parseRetryAfter(headerValue(headers, 'retry-after'), nowMs)
  if (status === 429) {
    return {
      code: 'rate-limited',
      retryable: true,
      ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
    }
  }
  if ([408, 425, 500, 502, 503, 504].includes(status)) {
    return {
      code: status === 408 ? 'timeout' : 'service-unavailable',
      retryable: true,
      ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
    }
  }

  const code: ProviderErrorCode = status === 401
    ? 'authentication-required'
    : status === 403
      ? 'authorization-denied'
      : status === 404
        ? 'not-found'
        : status === 409 || status === 412
          ? 'conflict'
          : status >= 400 && status < 500
            ? 'invalid-request'
            : 'unknown'
  return { code, retryable: false }
}

const REDACTED = '[REDACTED]'
const SENSITIVE_KEY_PATTERN =
  /(?:authorization|cookie|credential|secret|password|passphrase|token|nonce|document.?source|source|content|body)/i
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi
const ASSIGNMENT_PATTERN =
  /\b(access_token|refresh_token|id_token|token|secret|password|code|state)=([^&\s]+)/gi

function redactString(value: string): string {
  return value
    .replace(BEARER_PATTERN, `Bearer ${REDACTED}`)
    .replace(ASSIGNMENT_PATTERN, (_match, key: string) => `${key}=${REDACTED}`)
}

export function sanitizeProviderLogValue(
  value: unknown,
  seen = new WeakSet<object>(),
): unknown {
  if (typeof value === 'string') return redactString(value)
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) return '[Circular]'
  seen.add(value)

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
    }
  }
  if (Array.isArray(value)) {
    return value.map(item => sanitizeProviderLogValue(item, seen))
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key)
        ? REDACTED
        : sanitizeProviderLogValue(item, seen),
    ]),
  )
}
