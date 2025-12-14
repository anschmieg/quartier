/**
 * API endpoint to list sessions shared with the current user
 */

interface Session {
    id: string
    owner: string
    paths: string[]
    members: string[]
    created: number
    name?: string
}

interface Env {
    QUARTIER_KV: KVNamespace
    DEV_USER_EMAIL?: string
}

function getAuthEmail(context: EventContext<Env, any, any>): string | null {
    return context.request.headers.get('cf-access-authenticated-user-email')
        || context.env.DEV_USER_EMAIL
        || null
}

/**
 * GET - List sessions shared with the current user (where they're a member but not owner)
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
    const email = getAuthEmail(context)

    if (!email) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    try {
        // Get user's shared sessions list from their member index
        const memberOfRaw = await context.env.QUARTIER_KV.get(`member:${email}`)
        const memberOf: string[] = memberOfRaw ? JSON.parse(memberOfRaw) : []

        // Fetch each session
        const sessions = []
        for (const sessionId of memberOf) {
            const sessionData = await context.env.QUARTIER_KV.get(`session:${sessionId}`, 'json') as Session | null

            // Skip if session no longer exists or user is the owner
            if (!sessionData || sessionData.owner === email) continue

            sessions.push({
                id: sessionData.id,
                name: sessionData.name,
                paths: sessionData.paths,
                owner: sessionData.owner.split('@')[0] + '@***', // Mask owner email
                memberCount: sessionData.members.length,
                created: sessionData.created
            })
        }

        return new Response(JSON.stringify({ sessions }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        console.error('[sessions/shared] Error:', error)
        return new Response(JSON.stringify({ error: 'Failed to load shared sessions' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
