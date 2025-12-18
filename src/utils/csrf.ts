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
  return match ? match[2] : null
}
