/**
 * Fetch user repositories from GitHub
 */

interface Env {
    GITHUB_CLIENT_ID: string
    GITHUB_CLIENT_SECRET: string
    DEV_ACCESS_TOKEN?: string
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
        accessToken = context.env.DEV_ACCESS_TOKEN
    }

    if (!accessToken) {
        return new Response('Unauthorized', { status: 401 })
    }

    try {
        const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Quartier',
            },
        })

        if (!response.ok) {
            return new Response(`GitHub API error: ${response.statusText}`, { status: response.status })
        }

        const data = await response.json()
        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('GitHub API error:', error)
        return new Response('Failed to fetch repositories', { status: 500 })
    }
}
