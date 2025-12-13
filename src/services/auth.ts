/**
 * Cloudflare Access Authentication Service
 * 
 * Cloudflare Access sets headers on authenticated requests:
 * - cf-access-authenticated-user-email: The user's email
 * - cf-access-jwt-assertion: JWT token for verification
 * 
 * Note: These headers are only available server-side (in Functions).
 * Client-side, we detect auth by attempting to access protected resources.
 */

export interface AuthUser {
    email: string
    name?: string
}

/**
 * Check if the user is authenticated by calling a protected endpoint
 */
export async function getAuthUser(): Promise<AuthUser | null> {
    try {
        const response = await fetch('/api/auth/me')

        if (!response.ok) {
            return null
        }

        const data = await response.json()
        return data.user || null
    } catch {
        return null
    }
}

/**
 * Redirect to Cloudflare Access login
 */
export function login(): void {
    window.location.href = '/cdn-cgi/access/login'
}

/**
 * Logout from Cloudflare Access
 */
export function logout(): void {
    window.location.href = '/cdn-cgi/access/logout'
}
