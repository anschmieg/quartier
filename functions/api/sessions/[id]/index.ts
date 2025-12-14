/**
 * Session API - Single session operations
 * 
 * DELETE /api/sessions/:id - Delete a session
 * GET /api/sessions/:id - Get session details
 */

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
    DEV_USER_EMAIL?: string
}

function getAuthEmail(context: EventContext<Env, any, any>): string | null {
    return context.request.headers.get('cf-access-authenticated-user-email')
        || context.env.DEV_USER_EMAIL
        || null
}

/**
 * Get session details
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
    const email = getAuthEmail(context)
    const sessionId = context.params.id as string

    if (!email) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
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

        // Only owner or members can view session
        if (session.owner !== email && !session.members.includes(email)) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        return new Response(JSON.stringify({ session }), {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        console.error('[session] Get error:', error)
        return new Response(JSON.stringify({ error: 'Failed to get session' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}

/**
 * Delete a session (owner only)
 */
export const onRequestDelete: PagesFunction<Env> = async (context) => {
    const email = getAuthEmail(context)
    const sessionId = context.params.id as string

    if (!email) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
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

        // Only owner can delete
        if (session.owner !== email) {
            return new Response(JSON.stringify({ error: 'Only session owner can delete' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Delete all share tokens for this session
        const shareTokensKey = `session:${sessionId}:tokens`
        const tokenIds = await context.env.QUARTIER_KV.get(shareTokensKey, 'json') as string[] || []
        for (const token of tokenIds) {
            await context.env.QUARTIER_KV.delete(`share:${token}`)
        }
        await context.env.QUARTIER_KV.delete(shareTokensKey)

        // Remove session from owner's list
        const ownerKey = `sessions:${email}`
        const existingList = await context.env.QUARTIER_KV.get(ownerKey, 'json') as string[] || []
        const updatedList = existingList.filter(id => id !== sessionId)
        await context.env.QUARTIER_KV.put(ownerKey, JSON.stringify(updatedList))

        // Remove member indexes
        for (const member of session.members) {
            if (member !== email) {
                const memberKey = `member:${member}`
                const memberSessions = await context.env.QUARTIER_KV.get(memberKey, 'json') as string[] || []
                const updatedMemberSessions = memberSessions.filter(id => id !== sessionId)
                await context.env.QUARTIER_KV.put(memberKey, JSON.stringify(updatedMemberSessions))
            }
        }

        // Delete the session itself
        await context.env.QUARTIER_KV.delete(`session:${sessionId}`)

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        console.error('[session] Delete error:', error)
        return new Response(JSON.stringify({ error: 'Failed to delete session' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
