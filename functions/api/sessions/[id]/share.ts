/**
 * Session Share API
 * 
 * POST /api/sessions/:id/share - Create share link
 */

import { Session, ShareToken, generateShareToken } from '../../types/session'

interface Env {
    QUARTIER_KV: KVNamespace
}

/**
 * Create a new share link for a session
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
    const email = context.request.headers.get('cf-access-authenticated-user-email')

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

        const shareToken: ShareToken = {
            token: generateShareToken(),
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

        // Generate share URL
        const url = new URL(context.request.url)
        const shareUrl = `${url.origin}/join/${shareToken.token}`

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
