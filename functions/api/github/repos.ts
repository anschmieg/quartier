/**
 * Fetch user repositories from GitHub
 */

import { checkRateLimit, createErrorResponse } from '../../utils/validation'

interface Env {
    GITHUB_CLIENT_ID: string
    GITHUB_CLIENT_SECRET: string
    DEV_ACCESS_TOKEN?: string
    QUARTIER_KV: KVNamespace
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const cookieHeader = context.request.headers.get('Cookie')
    if (!cookieHeader) {
        return new Response('Unauthorized', { status: 401 })
    }

    const tokenMatch = cookieHeader ? cookieHeader.match(/(^| )gh_token=([^;]+)/) : null
    let accessToken = tokenMatch ? tokenMatch[2] : null

    // Fallback for local development
    if (!accessToken && context.env.DEV_ACCESS_TOKEN) {
        console.log('Using DEV_ACCESS_TOKEN from env')
        accessToken = context.env.DEV_ACCESS_TOKEN
    }

    if (!accessToken) {
        console.log('No access token found')
        return new Response('Unauthorized - No token', { status: 401 })
    }

    // Rate limiting: 30 requests per minute per user
    const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(accessToken))
    const tokenId = Array.from(new Uint8Array(tokenHash)).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('')
    const rateLimit = await checkRateLimit(context.env.QUARTIER_KV, `repos:${tokenId}`, 30, 60)
    if (!rateLimit.allowed) {
        return createErrorResponse('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED')
    }

    try {
        console.log('Fetching repos from GitHub...')
        const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Quartier',
            },
        })

        console.log('GitHub API Status:', response.status)

        if (!response.ok) {
            const text = await response.text()
            console.error('GitHub API Error Body:', text)
            return new Response(`GitHub API error: ${response.statusText}`, { status: response.status })
        }

        const data = await response.json()
        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('GitHub API catch:', error)
        return new Response('Failed to fetch repositories', { status: 500 })
    }
}
