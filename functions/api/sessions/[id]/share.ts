/**
 * Session Share API
 * 
 * POST /api/sessions/:id/share - Create share link
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

function generateShareToken(): string {
    return `share_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
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
