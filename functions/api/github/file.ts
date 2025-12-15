/**
 * Delete file from GitHub
 * DELETE /api/github/file
 * 
 * Body: { owner, repo, path, message, sha }
 */

import { checkRateLimit, createErrorResponse } from '../../utils/validation'

interface Env {
    DEV_ACCESS_TOKEN?: string
    QUARTIER_KV: KVNamespace
}

interface DeleteRequest {
    owner: string
    repo: string
    path: string
    message: string
    sha: string
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
    const cookieHeader = context.request.headers.get('Cookie')
    const tokenMatch = cookieHeader ? cookieHeader.match(/(^| )gh_token=([^;]+)/) : null
    let accessToken = tokenMatch ? tokenMatch[2] : null

    if (!accessToken && context.env.DEV_ACCESS_TOKEN) {
        accessToken = context.env.DEV_ACCESS_TOKEN
    }

    if (!accessToken) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    // Rate limiting: 30 requests per minute per user
    const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(accessToken))
    const tokenId = Array.from(new Uint8Array(tokenHash)).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('')
    const rateLimit = await checkRateLimit(context.env.QUARTIER_KV, `delete:${tokenId}`, 30, 60)
    if (!rateLimit.allowed) {
        return createErrorResponse('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED')
    }

    try {
        const body = await context.request.json() as DeleteRequest

        if (!body.owner || !body.repo || !body.path || !body.message || !body.sha) {
            return new Response(JSON.stringify({
                error: 'Missing required fields: owner, repo, path, message, sha'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const response = await fetch(
            `https://api.github.com/repos/${body.owner}/${body.repo}/contents/${body.path}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Quartier',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: body.message,
                    sha: body.sha,
                }),
            }
        )

        if (!response.ok) {
            const text = await response.text()
            console.error('[delete] GitHub API Error:', text)
            return new Response(JSON.stringify({
                error: `GitHub API error: ${response.statusText}`,
                details: text
            }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const result = await response.json() as { commit: { sha: string } }

        // Clear KV cache
        if (context.env.QUARTIER_KV) {
            const kvKey = `${body.owner}/${body.repo}/${body.path}`
            await context.env.QUARTIER_KV.delete(kvKey)
        }

        return new Response(JSON.stringify({
            success: true,
            commitSha: result.commit.sha
        }), {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        console.error('[delete] Error:', error)
        return new Response(JSON.stringify({
            error: 'Failed to delete file',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
