/**
 * KV Sync API - Store and retrieve file edits
 * 
 * Endpoints:
 * - GET /api/sync/{owner}/{repo}/{path} - Get cached file content
 * - PUT /api/sync/{owner}/{repo}/{path} - Save file content
 * - DELETE /api/sync/{owner}/{repo}/{path} - Delete cached content
 * 
 * Authentication: Requires Cloudflare Access (cf-access-authenticated-user-email header)
 * Rate Limiting: 100 requests per minute per user
 */

import { checkRateLimit, createErrorResponse } from '../../utils/validation'

interface Env {
    QUARTIER_KV: KVNamespace
}

interface SyncData {
    content: string
    user: string
    timestamp: number
    sha?: string // GitHub commit SHA if known
    yjsState?: string // Base64 encoded Yjs document state for conflict-free merging
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const email = context.request.headers.get('cf-access-authenticated-user-email')

    if (!email) {
        return createErrorResponse('Unauthorized', 401, 'UNAUTHORIZED')
    }

    // Rate limiting: 100 requests per minute per user
    const rateLimit = await checkRateLimit(context.env.QUARTIER_KV, `sync:${email}`, 100, 60)
    if (!rateLimit.allowed) {
        return createErrorResponse('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED')

    // Extract path from URL: /api/sync/owner/repo/path/to/file.md
    const url = new URL(context.request.url)
    const pathParts = url.pathname.replace('/api/sync/', '').split('/')

    // Case 1: List files (owner/repo)
    if (pathParts.length === 2) {
        const prefix = pathParts.join('/') + '/'
        try {
            const list = await context.env.QUARTIER_KV.list({ prefix })
            // Return just the paths relative to the repo
            const files = list.keys.map(k => ({
                path: k.name.replace(prefix, ''),
                // We can't easily know if it's a dir, but for KV everything is a file?
                // Actually KV stores file content. So these are files.
                type: 'file'
            }))
            return new Response(JSON.stringify(files), {
                headers: { 'Content-Type': 'application/json' }
            })
        } catch (error) {
            console.error('[sync] LIST error:', error)
            return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
        }
    }

    // Case 2: Get file content (owner/repo/path/to/file)
    if (pathParts.length < 3) {
        return new Response(JSON.stringify({ error: 'Invalid path: need owner/repo/filepath' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    const key = pathParts.join('/')

    try {
        const data = await context.env.QUARTIER_KV.get(key, 'json') as SyncData | null

        if (!data) {
            return new Response(JSON.stringify({ error: 'Not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        console.error('[sync] GET error:', error)
        return new Response(JSON.stringify({ error: 'Internal error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
    const email = context.request.headers.get('cf-access-authenticated-user-email')

    if (!email) {
        return createErrorResponse('Unauthorized', 401, 'UNAUTHORIZED')
    }

    // Rate limiting: 100 requests per minute per user
    const rateLimit = await checkRateLimit(context.env.QUARTIER_KV, `sync:${email}`, 100, 60)
    if (!rateLimit.allowed) {
        return createErrorResponse('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED')
    }

    const url = new URL(context.request.url)
    const pathParts = url.pathname.replace('/api/sync/', '').split('/')

    if (pathParts.length < 3) {
        return new Response(JSON.stringify({ error: 'Invalid path: need owner/repo/filepath' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    const key = pathParts.join('/')

    try {
        const body = await context.request.json() as {
            content: string
            sha?: string
            yjsState?: string // Base64 encoded Yjs state
        }

        if (!body.content && body.content !== '') {
            return new Response(JSON.stringify({ error: 'Missing content' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const data: SyncData = {
            content: body.content,
            user: email,
            timestamp: Date.now(),
            sha: body.sha,
            yjsState: body.yjsState
        }

        // Store with 30 day expiration (in seconds)
        await context.env.QUARTIER_KV.put(key, JSON.stringify(data), {
            expirationTtl: 30 * 24 * 60 * 60
        })

        return new Response(JSON.stringify({ success: true, timestamp: data.timestamp }), {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        console.error('[sync] PUT error:', error)
        return new Response(JSON.stringify({ error: 'Internal error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
    const email = context.request.headers.get('cf-access-authenticated-user-email')

    if (!email) {
        return createErrorResponse('Unauthorized', 401, 'UNAUTHORIZED')
    }

    // Rate limiting: 100 requests per minute per user
    const rateLimit = await checkRateLimit(context.env.QUARTIER_KV, `sync:${email}`, 100, 60)
    if (!rateLimit.allowed) {
        return createErrorResponse('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED')
    }

    const url = new URL(context.request.url)
    const pathParts = url.pathname.replace('/api/sync/', '').split('/')

    if (pathParts.length < 3) {
        return new Response(JSON.stringify({ error: 'Invalid path: need owner/repo/filepath' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    const key = pathParts.join('/')

    try {
        await context.env.QUARTIER_KV.delete(key)

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        console.error('[sync] DELETE error:', error)
        return new Response(JSON.stringify({ error: 'Internal error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
