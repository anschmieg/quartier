import { describe, it, expect, vi, beforeEach } from 'vitest'
import { onRequest } from '../../functions/api/_middleware'

// Mock Validation Utils
vi.mock('../../functions/utils/validation', () => ({
  checkRateLimit: vi.fn(),
  createErrorResponse: (msg: string, status: number, code: string, details?: any) => {
    return new Response(JSON.stringify({ error: msg, code, details }), { status })
  }
}))

import { checkRateLimit } from '../../functions/utils/validation'

describe('API Security Middleware', () => {
  let mockContext: any
  let mockNext: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockNext = vi.fn().mockResolvedValue(new Response('OK', { status: 200 }))
    
    mockContext = {
      request: new Request('http://localhost/api/test'),
      env: { QUARTIER_KV: {} }, // Mock KV
      next: mockNext,
      waitUntil: vi.fn()
    }
  })

  describe('Rate Limiting', () => {
    it('should allow request when within limit', async () => {
      // Mock validation success
      vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, remaining: 59 })

      const response = await onRequest(mockContext as any)
      
      expect(checkRateLimit).toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('59')
    })

    it('should block request when limit exceeded', async () => {
      // Mock validation failure
      vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, remaining: 0 })

      const response = await onRequest(mockContext as any)
      
      expect(mockNext).not.toHaveBeenCalled()
      expect(response.status).toBe(429)
      const body = await response.json() as any
      expect(body.code).toBe('RATE_LIMIT_EXCEEDED')
    })
  })

  describe('CSRF Protection', () => {
    beforeEach(() => {
      // Assume rate limit always passes for CSRF tests
      vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, remaining: 60 })
    })

    it('should set csrf-token cookie on first request', async () => {
      // No cookie in request
      mockContext.request = new Request('http://localhost/api/test', {
        method: 'GET'
      })

      const response = await onRequest(mockContext as any)
      
      const setCookie = response.headers.get('Set-Cookie')
      expect(setCookie).toContain('csrf-token=')
      expect(setCookie).toContain('Path=/')
      expect(setCookie).toContain('SameSite=Lax')
    })

    it('should preserve existing csrf-token cookie', async () => {
      // Existing cookie
      mockContext.request = new Request('http://localhost/api/test', {
        method: 'GET',
        headers: { 'Cookie': 'csrf-token=existing-token' }
      })

      const response = await onRequest(mockContext as any)
      
      // Should NOT set new cookie
      expect(response.headers.get('Set-Cookie')).toBeNull() 
      // Note: Implementation doesn't set cookie if it exists
    })

    it('should block POST without CSRF header', async () => {
      mockContext.request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { 'Cookie': 'csrf-token=valid-token' }
      })

      const response = await onRequest(mockContext as any)

      expect(response.status).toBe(403)
      const body = await response.json() as any
      expect(body.code).toBe('CSRF_MISMATCH')
    })

    it('should block POST with mismatching CSRF header', async () => {
      mockContext.request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { 
          'Cookie': 'csrf-token=valid-token',
          'X-CSRF-Token': 'wrong-token'
        }
      })

      const response = await onRequest(mockContext as any)

      expect(response.status).toBe(403)
    })

    it('should allow POST with matching CSRF header', async () => {
      mockContext.request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { 
          'Cookie': 'csrf-token=valid-token',
          'X-CSRF-Token': 'valid-token'
        }
      })

      const response = await onRequest(mockContext as any)

      expect(response.status).toBe(200) // Or whatever mockNext returns
      expect(mockNext).toHaveBeenCalled()
    })
    
    it('should generate cookie and block POST if cookie was missing entirely', async () => {
       // Scenario: First time user POSTs (unlikely but possible if cookie expired)
       // Middleware generates a NEW token. Request has NO header (or wrong header).
       // It should block because generated token !== undefined/wrong header.
       
       mockContext.request = new Request('http://localhost/api/test', {
        method: 'POST'
      })

      const response = await onRequest(mockContext as any)
      
      expect(response.status).toBe(403)
      // It should ALSO set the new cookie so the client can retry
      expect(response.headers.get('Set-Cookie')).toContain('csrf-token=')
    })
  })
})
