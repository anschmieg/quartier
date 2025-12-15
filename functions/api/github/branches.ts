/**
 * List branches for a repository
 * GET /api/github/branches?owner=xxx&repo=xxx
 */

import { checkRateLimit, createErrorResponse } from '../../utils/validation'

interface Env {
    DEV_ACCESS_TOKEN?: string
    QUARTIER_KV: KVNamespace
}

interface Branch {
    name: string
    commit: {
        sha: string
    }
    protected: boolean
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
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
    const rateLimit = await checkRateLimit(context.env.QUARTIER_KV, `branches:${tokenId}`, 30, 60)
    if (!rateLimit.allowed) {
        return createErrorResponse('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED')
    }

    const url = new URL(context.request.url)
    const owner = url.searchParams.get('owner')
    const repo = url.searchParams.get('repo')

    if (!owner || !repo) {
        return new Response(JSON.stringify({ error: 'Missing owner or repo parameter' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    try {
        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Quartier',
                },
            }
        )

        if (!response.ok) {
            const text = await response.text()
            console.error('[branches] GitHub API Error:', text)
            return new Response(JSON.stringify({
                error: `GitHub API error: ${response.statusText}`
            }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const branches = await response.json() as Branch[]

        // Also get default branch info
        const repoResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Quartier',
                },
            }
        )

        let defaultBranch = 'main'
        if (repoResponse.ok) {
            const repoData = await repoResponse.json() as { default_branch: string }
            defaultBranch = repoData.default_branch
        }

        return new Response(JSON.stringify({
            branches: branches.map(b => ({
                name: b.name,
                sha: b.commit.sha,
                protected: b.protected,
                isDefault: b.name === defaultBranch
            })),
            defaultBranch
        }), {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        console.error('[branches] Error:', error)
        return new Response(JSON.stringify({
            error: 'Failed to fetch branches',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
