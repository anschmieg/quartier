/**
 * Input validation utilities for API endpoints
 * Provides type-safe validation and sanitization
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

/**
 * Validate GitHub owner/repo format
 */
export function isValidRepoPath(path: string): boolean {
    // Must be owner/repo format or owner/repo/path
    const parts = path.split('/')
    return parts.length >= 2 && parts.every(p => p.length > 0 && /^[a-zA-Z0-9._-]+$/.test(p))
}

/**
 * Validate session ID format
 */
export function isValidSessionId(id: string): boolean {
    // Should be session_ prefix followed by 12 hex characters
    return /^session_[a-f0-9]{12}$/.test(id)
}

/**
 * Validate share token format (human-id style)
 */
export function isValidShareToken(token: string): boolean {
    // human-id format: word-word-word (3 words, hyphens, lowercase/uppercase)
    return /^[a-z]+-[a-z]+-[a-z]+$/i.test(token)
}

/**
 * Sanitize file path to prevent directory traversal
 */
export function sanitizeFilePath(path: string): string {
    // Remove leading/trailing slashes
    let sanitized = path.trim().replace(/^\/+|\/+$/g, '')
    
    // Remove any .. sequences
    sanitized = sanitized.replace(/\.\./g, '')
    
    // Remove multiple consecutive slashes
    sanitized = sanitized.replace(/\/+/g, '/')
    
    return sanitized
}

/**
 * Validate commit message (length and content)
 */
export function isValidCommitMessage(message: string): boolean {
    return message.length >= 3 && message.length <= 500 && message.trim().length > 0
}

/**
 * Rate limiting helper using KV
 * Returns true if request should be allowed, false if rate limited
 */
export async function checkRateLimit(
    kv: KVNamespace,
    key: string,
    limit: number,
    windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now()
    const windowKey = `ratelimit:${key}:${Math.floor(now / (windowSeconds * 1000))}`
    
    const current = await kv.get(windowKey)
    const count = current ? parseInt(current, 10) : 0
    
    if (count >= limit) {
        return { allowed: false, remaining: 0 }
    }
    
    await kv.put(windowKey, String(count + 1), {
        expirationTtl: windowSeconds
    })
    
    return { allowed: true, remaining: limit - count - 1 }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
    message: string,
    status: number,
    code?: string,
    details?: any
): Response {
    const body = {
        error: message,
        ...(code && { code }),
        ...(details && { details }),
    }
    
    return new Response(JSON.stringify(body), {
        status,
        headers: { 
            'Content-Type': 'application/json',
            // Prevent caching of error responses
            'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
    })
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse(data: any, status: number = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 
            'Content-Type': 'application/json',
            // Allow caching of successful GET responses for 60 seconds
            'Cache-Control': 'public, max-age=60',
        }
    })
}

/**
 * Validate request body has required fields
 */
export function validateRequiredFields(
    body: any,
    fields: string[]
): { valid: boolean; missing?: string[] } {
    const missing = fields.filter(field => !(field in body) || body[field] === undefined)
    
    if (missing.length > 0) {
        return { valid: false, missing }
    }
    
    return { valid: true }
}
