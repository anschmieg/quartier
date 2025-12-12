/**
 * Fetch repository contents from GitHub
 * GET /api/github/content?owner=xxx&repo=xxx&path=xxx
 */

interface Env {
    DEV_ACCESS_TOKEN?: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url)
    const owner = url.searchParams.get('owner')
    const repo = url.searchParams.get('repo')
    const path = url.searchParams.get('path') || ''

    if (!owner || !repo) {
        return new Response('Missing owner or repo parameter', { status: 400 })
    }

    const cookieHeader = context.request.headers.get('Cookie')
    const tokenMatch = cookieHeader ? cookieHeader.match(/(^| )gh_token=([^;]+)/) : null
    let accessToken = tokenMatch ? tokenMatch[2] : null

    // Fallback for local development
    if (!accessToken && context.env.DEV_ACCESS_TOKEN) {
        accessToken = context.env.DEV_ACCESS_TOKEN
    }

    if (!accessToken) {
        return new Response('Unauthorized', { status: 401 })
    }

    try {
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Quartier',
            },
        })

        if (!response.ok) {
            const text = await response.text()
            console.error('GitHub API Error:', text)
            return new Response(`GitHub API error: ${response.statusText}`, { status: response.status })
        }

        const data = await response.json()
        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('GitHub API error:', error)
        return new Response('Failed to fetch repository contents', { status: 500 })
    }
}
