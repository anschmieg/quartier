/**
 * Sessions API
 * 
 * POST /api/sessions - Create a new session
 * GET /api/sessions - List user's sessions
 */

import { Session, generateSessionId } from '../types/session'

interface Env {
    QUARTIER_KV: KVNamespace
}

/**
 * Create a new session
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
    const email = context.request.headers.get('cf-access-authenticated-user-email')

    if (!email) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    try {
        const body = await context.request.json() as {
            files: string[]
            name?: string
        }

        if (!body.files || body.files.length === 0) {
            return new Response(JSON.stringify({ error: 'At least one file required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const session: Session = {
            id: generateSessionId(),
            owner: email,
            files: body.files,
            members: [email], // Owner is first member
            created: Date.now(),
            name: body.name
        }

        // Store session
        await context.env.QUARTIER_KV.put(
            `session:${session.id}`,
            JSON.stringify(session),
            { expirationTtl: 90 * 24 * 60 * 60 } // 90 days
        )

        // Also index by owner for listing
        const ownerKey = `sessions:${email}`
        const existingList = await context.env.QUARTIER_KV.get(ownerKey, 'json') as string[] || []
        existingList.push(session.id)
        await context.env.QUARTIER_KV.put(ownerKey, JSON.stringify(existingList))

        return new Response(JSON.stringify({ session }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        console.error('[sessions] Create error:', error)
        return new Response(JSON.stringify({ error: 'Failed to create session' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}

/**
 * List user's sessions
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
    const email = context.request.headers.get('cf-access-authenticated-user-email')

    if (!email) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    try {
        // Get session IDs for user
        const ownerKey = `sessions:${email}`
        const sessionIds = await context.env.QUARTIER_KV.get(ownerKey, 'json') as string[] || []

        // Fetch all sessions
        const sessions: Session[] = []
        for (const id of sessionIds) {
            const session = await context.env.QUARTIER_KV.get(`session:${id}`, 'json') as Session | null
            if (session) {
                sessions.push(session)
            }
        }

        // Also get sessions where user is a member (not owner)
        // This would require a separate index - simplified for now

        return new Response(JSON.stringify({ sessions }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        console.error('[sessions] List error:', error)
        return new Response(JSON.stringify({ error: 'Failed to list sessions' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
