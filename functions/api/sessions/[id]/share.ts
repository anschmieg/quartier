/**
 * Session Share API
 * 
 * POST /api/sessions/:id/share - Create share link
 * GET /api/sessions/:id/share - List share links
 * DELETE /api/sessions/:id/share?token=xxx - Revoke share link
 */

// Inlined types (Wrangler can't resolve imports from ../../types/)
interface Session {
    id: string
    owner: string
    paths: string[]
    members: string[]
    created: number
    name?: string
}

interface ShareToken {
    token: string
    sessionId: string
    permission: 'edit' | 'view'
    expiresAt?: number
    createdBy: string
    created: number
}

import { humanId } from 'human-id'

function generateShareToken(): string {
    return humanId({ separator: '-', capitalize: false })
}

interface Env {
    QUARTIER_KV: KVNamespace
    DEV_USER_EMAIL?: string // For local dev without Cloudflare Access
}

/**
 * Get authenticated user email (Cloudflare Access or dev fallback)
 */
function getAuthEmail(context: EventContext<Env, any, any>): string | null {
    return context.request.headers.get('cf-access-authenticated-user-email')
        || context.env.DEV_USER_EMAIL
        || null
}

/**
 * Create a new share link for a session
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
    const email = getAuthEmail(context)

    if (!email) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    const sessionId = context.params.id as string

    try {
        // Get session
        const session = await context.env.QUARTIER_KV.get(`session:${sessionId}`, 'json') as Session | null

        if (!session) {
            return new Response(JSON.stringify({ error: 'Session not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Only owner can create share links
        if (session.owner !== email) {
            return new Response(JSON.stringify({ error: 'Only owner can share' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const body = await context.request.json() as {
            permission?: 'edit' | 'view'
            expiresIn?: number // hours
        }

        // Generate unique token with collision check
        let token = generateShareToken()
        let attempts = 0
        const maxAttempts = 5

        while (attempts < maxAttempts) {
            const existing = await context.env.QUARTIER_KV.get(`share:${token}`)
            if (!existing) break
            token = generateShareToken()
            attempts++
        }

        if (attempts >= maxAttempts) {
            return new Response(JSON.stringify({ error: 'Failed to generate unique share link' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const shareToken: ShareToken = {
            token,
            sessionId: session.id,
            permission: body.permission || 'edit',
            createdBy: email,
            created: Date.now(),
            expiresAt: body.expiresIn ? Date.now() + body.expiresIn * 60 * 60 * 1000 : undefined
        }

        // Store share token
        await context.env.QUARTIER_KV.put(
            `share:${shareToken.token}`,
            JSON.stringify(shareToken),
            { expirationTtl: body.expiresIn ? body.expiresIn * 60 * 60 : 90 * 24 * 60 * 60 }
        )

        // Index token by session for listing/cleanup
        const tokensKey = `session:${sessionId}:tokens`
        const existingTokens = await context.env.QUARTIER_KV.get(tokensKey, 'json') as string[] || []
        existingTokens.push(token)
        await context.env.QUARTIER_KV.put(tokensKey, JSON.stringify(existingTokens))

        // Generate share URL
        const url = new URL(context.request.url)
        const shareUrl = `${url.origin}/s/${shareToken.token}`

        return new Response(JSON.stringify({
            shareToken,
            shareUrl
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        console.error('[share] Create error:', error)
        return new Response(JSON.stringify({ error: 'Failed to create share link' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}

/**
 * List share links for a session
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
    const email = getAuthEmail(context)

    if (!email) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    const sessionId = context.params.id as string

    try {
        const session = await context.env.QUARTIER_KV.get(`session:${sessionId}`, 'json') as Session | null

        if (!session) {
            return new Response(JSON.stringify({ error: 'Session not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Only owner can list share links
        if (session.owner !== email) {
            return new Response(JSON.stringify({ error: 'Only owner can view share links' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Get all tokens for this session
        const tokensKey = `session:${sessionId}:tokens`
        const tokenIds = await context.env.QUARTIER_KV.get(tokensKey, 'json') as string[] || []

        const tokens: ShareToken[] = []
        for (const tokenId of tokenIds) {
            const token = await context.env.QUARTIER_KV.get(`share:${tokenId}`, 'json') as ShareToken | null
            if (token) {
                tokens.push(token)
            }
        }

        return new Response(JSON.stringify({ tokens }), {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        console.error('[share] List error:', error)
        return new Response(JSON.stringify({ error: 'Failed to list share links' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}

/**
 * Revoke a share link
 * DELETE /api/sessions/:id/share?token=xxx
 */
export const onRequestDelete: PagesFunction<Env> = async (context) => {
    const email = getAuthEmail(context)

    if (!email) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    const sessionId = context.params.id as string
    const url = new URL(context.request.url)
    const tokenToRevoke = url.searchParams.get('token')

    if (!tokenToRevoke) {
        return new Response(JSON.stringify({ error: 'Token parameter required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    try {
        const session = await context.env.QUARTIER_KV.get(`session:${sessionId}`, 'json') as Session | null

        if (!session) {
            return new Response(JSON.stringify({ error: 'Session not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Only owner can revoke share links
        if (session.owner !== email) {
            return new Response(JSON.stringify({ error: 'Only owner can revoke share links' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Delete the token
        await context.env.QUARTIER_KV.delete(`share:${tokenToRevoke}`)

        // Remove from session's token list
        const tokensKey = `session:${sessionId}:tokens`
        const existingTokens = await context.env.QUARTIER_KV.get(tokensKey, 'json') as string[] || []
        const updatedTokens = existingTokens.filter(t => t !== tokenToRevoke)
        await context.env.QUARTIER_KV.put(tokensKey, JSON.stringify(updatedTokens))

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        console.error('[share] Revoke error:', error)
        return new Response(JSON.stringify({ error: 'Failed to revoke share link' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
