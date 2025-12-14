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

// Word lists for generating memorable share tokens
const adjectives = ['red', 'blue', 'green', 'gold', 'silver', 'swift', 'calm', 'bold', 'bright', 'dark', 'warm', 'cool', 'wild', 'soft', 'sharp', 'quiet', 'loud', 'quick', 'slow', 'tall', 'deep', 'wide', 'thin', 'rich', 'pure']
const nouns = ['apple', 'river', 'mountain', 'forest', 'ocean', 'storm', 'moon', 'star', 'cloud', 'stone', 'leaf', 'flame', 'wave', 'wind', 'snow', 'rain', 'sun', 'tree', 'bird', 'fish', 'bear', 'wolf', 'fox', 'owl', 'hawk']
const verbs = ['runs', 'flies', 'grows', 'shines', 'falls', 'rises', 'flows', 'drifts', 'leaps', 'glows', 'burns', 'floats', 'rolls', 'spins', 'soars', 'dives', 'climbs', 'rests', 'waits', 'moves', 'turns', 'stays', 'goes', 'comes', 'dreams']

function generateShareToken(): string {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    const verb = verbs[Math.floor(Math.random() * verbs.length)]
    return `${adj}-${noun}-${verb}`
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
