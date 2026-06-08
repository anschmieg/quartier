/**
 * CSRF Protection Utility
 * 
 * Implements client-side logic for Double Submit Cookie pattern.
 * Reads the non-HttpOnly 'csrf-token' cookie to include in headers.
 */

/**
 * Retrieve the current CSRF token from cookies
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(^| )csrf-token=([^;]+)/)
  return match ? (match[2] ?? null) : null
}

const TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/

export type StateTokenValidationCode =
  | 'valid'
  | 'missing'
  | 'malformed'
  | 'mismatch'

export interface StateTokenValidation {
  valid: boolean
  code: StateTokenValidationCode
}

export function createStateToken(byteLength = 32): string {
  if (!Number.isSafeInteger(byteLength) || byteLength < 16 || byteLength > 128) {
    throw new Error('State tokens must use between 16 and 128 random bytes.')
  }
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Secure random token generation is unavailable.')
  }

  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(byteLength))
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

export function constantTimeTokenEqual(left: string, right: string): boolean {
  const maximumLength = Math.max(left.length, right.length)
  let difference = left.length ^ right.length

  for (let index = 0; index < maximumLength; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0)
  }

  return difference === 0
}

function isTokenShapeValid(token: string): boolean {
  return token.length >= 22
    && token.length <= 172
    && TOKEN_PATTERN.test(token)
}

export function validateStateToken(
  expected: string | null | undefined,
  provided: string | null | undefined,
): StateTokenValidation {
  if (!expected || !provided) {
    return { valid: false, code: 'missing' }
  }
  if (!isTokenShapeValid(expected) || !isTokenShapeValid(provided)) {
    return { valid: false, code: 'malformed' }
  }
  if (!constantTimeTokenEqual(expected, provided)) {
    return { valid: false, code: 'mismatch' }
  }
  return { valid: true, code: 'valid' }
}
