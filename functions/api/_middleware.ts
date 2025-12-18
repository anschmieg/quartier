import { checkRateLimit, createErrorResponse } from '../utils/validation'

interface Env {
  QUARTIER_KV: KVNamespace
}

export const onRequest: PagesFunction<Env> = async (context) => {
  // 1. Identify Client
  // Prefer CF-Connecting-IP, fallback to 'unknown' if not present (should exist in production)
  const clientIp = context.request.headers.get('CF-Connecting-IP') || 'unknown'
  
  // 2. Define Limit
  // Default: 60 requests per minute
  const LIMIT = 60
  const WINDOW_SECONDS = 60
  
  // 3. Check Limit
  // Use a global prefix to distinguish from other rate limits
  const rateLimitKey = `global:${clientIp}`
  
  try {
    const { allowed, remaining } = await checkRateLimit(
      context.env.QUARTIER_KV,
      rateLimitKey,
      LIMIT,
      WINDOW_SECONDS
    )
    
    if (!allowed) {
      // Return 429 immediately if limit exceeded
      const response = createErrorResponse(
        'Rate limit exceeded. Please try again later.',
        429,
        'RATE_LIMIT_EXCEEDED',
        { limit: LIMIT, remaining: 0, resetIn: WINDOW_SECONDS }
      )
      
      // Add standard rate limit headers
      response.headers.set('X-RateLimit-Limit', LIMIT.toString())
      response.headers.set('X-RateLimit-Remaining', '0')
      response.headers.set('X-RateLimit-Reset', (Math.floor(Date.now() / 1000) + WINDOW_SECONDS).toString())
      
      return response
    }
    
    // 4. CSRF Protection
    const method = context.request.method
    const UNSAFE_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH']
    
    // Get existing CSRF cookie
    const cookieHeader = context.request.headers.get('Cookie') || ''
    const cookieMatch = cookieHeader.match(/(^| )csrf-token=([^;]+)/)
    let csrfToken = cookieMatch ? cookieMatch[2] : null
    let setCsrfCookie = false

    // Generate token if missing
    if (!csrfToken) {
      csrfToken = crypto.randomUUID()
      setCsrfCookie = true
    }

    // Verify token on unsafe methods
    if (UNSAFE_METHODS.includes(method)) {
      const headerToken = context.request.headers.get('X-CSRF-Token')
      
      if (!headerToken || headerToken !== csrfToken) {
        return createErrorResponse(
          'CSRF verification failed',
          403,
          'CSRF_MISMATCH'
        )
      }
    }

    // 5. Proceed with request
    const response = await context.next()
    
    // 6. Add headers and Set-Cookie to response
    // We clone the response to modify headers if it's immutable
    const newResponse = new Response(response.body, response)
    
    // Rate Limit Headers
    newResponse.headers.set('X-RateLimit-Limit', LIMIT.toString())
    newResponse.headers.set('X-RateLimit-Remaining', remaining.toString())
    newResponse.headers.set('X-RateLimit-Reset', (Math.floor(Date.now() / 1000) + WINDOW_SECONDS).toString())
    
    // Set CSRF Cookie if needed (HttpOnly=false so JS can read it for header injection)
    // SameSite=Lax is good default. Secure=true in production.
    if (setCsrfCookie) {
      newResponse.headers.append(
        'Set-Cookie', 
        `csrf-token=${csrfToken}; Path=/; SameSite=Lax; Secure`
      )
    }
    
    return newResponse
    
  } catch (error) {
    // Fail open if KV is down or something goes wrong, but log it
    console.error('Rate limiting error:', error)
    return context.next()
  }
}
