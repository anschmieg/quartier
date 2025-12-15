/**
 * Sessions API
 * 
 * POST /api/sessions - Create a new session
 * GET /api/sessions - List user's sessions
 * 
 * Rate Limiting: 20 POST requests per minute per user, 50 GET requests per minute per user
 */

import { checkRateLimit, createErrorResponse } from '../../utils/validation'

// Inlined types (Wrangler can't resolve imports from ../types/)
interface Session {
    id: string
    owner: string
    // Path patterns: 
    // - "owner/repo" = entire repo
    // - "owner/repo/folder" = folder and subfolders  
    // - "owner/repo/folder/*" = explicit wildcard
    // - "owner/repo/file.md" = single file
    paths: string[]
    members: string[]
    created: number
    name?: string
}

function generateSessionId(): string {
    return `session_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
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
 * Create a new session
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
    const email = getAuthEmail(context)

    if (!email) {
        return createErrorResponse('Unauthorized', 401, 'UNAUTHORIZED')
    }

    // Rate limiting: 20 POST requests per minute per user
    const rateLimit = await checkRateLimit(context.env.QUARTIER_KV, `sessions:post:${email}`, 20, 60)
    if (!rateLimit.allowed) {
        return createErrorResponse('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED')
    }

    try {
        const body = await context.request.json() as {
            paths: string[]
            name?: string
        }

        if (!body.paths || body.paths.length === 0) {
            return new Response(JSON.stringify({ error: 'At least one path required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Validate path format (must be owner/repo or owner/repo/...)
        for (const path of body.paths) {
            const parts = path.replace(/\/\*$/, '').split('/')
            if (parts.length < 2) {
                return new Response(JSON.stringify({
                    error: `Invalid path format: ${path}. Must be owner/repo or owner/repo/path`
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                })
            }
        }

        const session: Session = {
            id: generateSessionId(),
            owner: email,
            paths: body.paths,
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
    const email = getAuthEmail(context)

    if (!email) {
        return createErrorResponse('Unauthorized', 401, 'UNAUTHORIZED')
    }

    // Rate limiting: 50 GET requests per minute per user
    const rateLimit = await checkRateLimit(context.env.QUARTIER_KV, `sessions:get:${email}`, 50, 60)
    if (!rateLimit.allowed) {
        return createErrorResponse('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED')
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
