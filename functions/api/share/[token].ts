/**
 * Share Token Validation & Join API
 * 
 * GET /api/share/:token - Validate token, get session info
 * POST /api/share/:token - Join session
 */

import { Session, ShareToken } from '../../types/session'

interface Env {
    QUARTIER_KV: KVNamespace
}

/**
 * Validate share token and get session info
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
    const token = context.params.token as string

    try {
        // Get share token
        const shareToken = await context.env.QUARTIER_KV.get(`share:${token}`, 'json') as ShareToken | null

        if (!shareToken) {
            return new Response(JSON.stringify({ error: 'Invalid or expired link' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Check expiration
        if (shareToken.expiresAt && Date.now() > shareToken.expiresAt) {
            return new Response(JSON.stringify({ error: 'Link has expired' }), {
                status: 410,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Get session
        const session = await context.env.QUARTIER_KV.get(`session:${shareToken.sessionId}`, 'json') as Session | null

        if (!session) {
            return new Response(JSON.stringify({ error: 'Session no longer exists' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Return session info (hide owner email partially for privacy)
        return new Response(JSON.stringify({
            session: {
                id: session.id,
                name: session.name,
                files: session.files,
                owner: session.owner.split('@')[0] + '@***',
                memberCount: session.members.length
            },
            permission: shareToken.permission
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        console.error('[share] Validate error:', error)
        return new Response(JSON.stringify({ error: 'Failed to validate link' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}

/**
 * Join a session via share token
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
    const email = context.request.headers.get('cf-access-authenticated-user-email')

    if (!email) {
        return new Response(JSON.stringify({ error: 'Please sign in to join' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    const token = context.params.token as string

    try {
        // Get share token
        const shareToken = await context.env.QUARTIER_KV.get(`share:${token}`, 'json') as ShareToken | null

        if (!shareToken) {
            return new Response(JSON.stringify({ error: 'Invalid or expired link' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Check expiration
        if (shareToken.expiresAt && Date.now() > shareToken.expiresAt) {
            return new Response(JSON.stringify({ error: 'Link has expired' }), {
                status: 410,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Get session
        const session = await context.env.QUARTIER_KV.get(`session:${shareToken.sessionId}`, 'json') as Session | null

        if (!session) {
            return new Response(JSON.stringify({ error: 'Session no longer exists' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Add user to members if not already
        if (!session.members.includes(email)) {
            session.members.push(email)
            await context.env.QUARTIER_KV.put(`session:${session.id}`, JSON.stringify(session))
            console.log(`[share] ${email} joined session ${session.id}`)
        }

        return new Response(JSON.stringify({
            success: true,
            session: {
                id: session.id,
                name: session.name,
                files: session.files,
                memberCount: session.members.length
            },
            permission: shareToken.permission
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        console.error('[share] Join error:', error)
        return new Response(JSON.stringify({ error: 'Failed to join session' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
