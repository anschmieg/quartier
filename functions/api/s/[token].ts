/**
 * Share Token Validation & Join API
 * 
 * GET /api/share/:token - Validate token, get session info
 * POST /api/share/:token - Join session
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
                paths: session.paths,
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
    const email = getAuthEmail(context)

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
                paths: session.paths,
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
