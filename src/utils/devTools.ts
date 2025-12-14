/**
 * Development-only utilities for testing different user scenarios
 * 
 * This entire module is ONLY included in development builds.
 * In production, imports will be tree-shaken out.
 */

/**
 * Get dev user override from URL params
 * Returns headers to add to API requests for user simulation
 * 
 * Usage: Add ?dev-user=other@test.com or ?dev-user=none to URL
 */
export function getDevUserHeaders(): HeadersInit {
    // This code is completely stripped in production
    if (!import.meta.env.DEV) return {}

    const params = new URLSearchParams(window.location.search)
    const devUser = params.get('dev-user')

    if (!devUser) return {}

    console.log(`[DEV] Simulating user: ${devUser === 'none' ? '(unauthenticated)' : devUser}`)

    return {
        'X-Dev-User': devUser
    }
}

/**
 * Create a fetch wrapper that includes dev user headers
 */
export function devFetch(url: string, options: RequestInit = {}): Promise<Response> {
    if (!import.meta.env.DEV) {
        return fetch(url, options)
    }

    const devHeaders = getDevUserHeaders()

    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            ...devHeaders
        }
    })
}

/**
 * Check if dev testing mode is active
 */
export function isDevTestMode(): boolean {
    if (!import.meta.env.DEV) return false

    const params = new URLSearchParams(window.location.search)
    return params.has('dev-user')
}

/**
 * Get the current dev user being simulated
 */
export function getDevUser(): string | null {
    if (!import.meta.env.DEV) return null

    const params = new URLSearchParams(window.location.search)
    return params.get('dev-user')
}
