/**
 * Commit file changes to GitHub
 * PUT /api/github/commit
 * 
 * Body: { owner, repo, path, content, message, sha? }
 * 
 * Rate Limiting: 30 commits per minute per user
 */

import { checkRateLimit, createErrorResponse } from '../../utils/validation'

interface Env {
    DEV_GITHUB_TOKEN?: string
    QUARTIER_KV: KVNamespace
}

interface CommitRequest {
    owner: string
    repo: string
    path: string
    content: string
    message: string
    sha?: string // Required for updates, optional for new files
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
    const cookieHeader = context.request.headers.get('Cookie')
    const tokenMatch = cookieHeader ? cookieHeader.match(/(^| )gh_token=([^;]+)/) : null
    let accessToken = tokenMatch ? tokenMatch[2] : null

    // Fallback for local development
    if (!accessToken && context.env.DEV_GITHUB_TOKEN) {
        accessToken = context.env.DEV_GITHUB_TOKEN
    }

    if (!accessToken) {
        return createErrorResponse('Unauthorized', 401, 'UNAUTHORIZED')
    }

    // Rate limiting: 30 commits per minute per user (use token as identifier)
    const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(accessToken))
    const tokenId = Array.from(new Uint8Array(tokenHash)).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('')
    const rateLimit = await checkRateLimit(context.env.QUARTIER_KV, `commit:${tokenId}`, 30, 60)
    if (!rateLimit.allowed) {
        return createErrorResponse('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED')
    }

    try {
        const body = await context.request.json() as CommitRequest

        if (!body.owner || !body.repo || !body.path || body.content === undefined || !body.message) {
            return new Response(JSON.stringify({
                error: 'Missing required fields: owner, repo, path, content, message'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // If no SHA provided, try to get it (for existing files)
        let sha = body.sha
        if (!sha) {
            try {
                const existingFile = await fetch(
                    `https://api.github.com/repos/${body.owner}/${body.repo}/contents/${body.path}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'User-Agent': 'Quartier',
                        },
                    }
                )
                if (existingFile.ok) {
                    const fileData = await existingFile.json() as { sha: string }
                    sha = fileData.sha
                }
            } catch {
                // File doesn't exist, that's fine - we're creating it
            }
        }

        // Base64 encode the content
        const contentBase64 = btoa(unescape(encodeURIComponent(body.content)))

        // Commit to GitHub
        const commitBody: Record<string, unknown> = {
            message: body.message,
            content: contentBase64,
        }
        if (sha) {
            commitBody.sha = sha
        }

        const response = await fetch(
            `https://api.github.com/repos/${body.owner}/${body.repo}/contents/${body.path}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Quartier',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(commitBody),
            }
        )

        if (!response.ok) {
            const text = await response.text()
            console.error('[commit] GitHub API Error:', text)
            return new Response(JSON.stringify({
                error: `GitHub API error: ${response.statusText}`,
                details: text
            }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const result = await response.json() as { commit: { sha: string }, content: { sha: string } }

        // Clear KV cache after successful commit
        if (context.env.QUARTIER_KV) {
            const kvKey = `${body.owner}/${body.repo}/${body.path}`
            await context.env.QUARTIER_KV.delete(kvKey)
            console.log('[commit] Cleared KV cache:', kvKey)
        }

        return new Response(JSON.stringify({
            success: true,
            commitSha: result.commit.sha,
            fileSha: result.content.sha
        }), {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        console.error('[commit] Error:', error)
        return new Response(JSON.stringify({
            error: 'Failed to commit',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
