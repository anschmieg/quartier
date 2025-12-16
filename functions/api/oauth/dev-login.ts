/**
 * Development login endpoint
 * 
 * Uses DEV_GITHUB_TOKEN to authenticate and set cookies for local development.
 * Only works when DEV_GITHUB_TOKEN is set (local development).
 */

interface Env {
    DEV_GITHUB_TOKEN?: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const devToken = context.env.DEV_GITHUB_TOKEN

    if (!devToken) {
        return new Response('DEV_GITHUB_TOKEN not configured. This endpoint only works in local development.', {
            status: 400
        })
    }

    try {
        // Fetch user info using the dev token
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${devToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Quartier-Dev',
            },
        })

        if (!userResponse.ok) {
            return new Response(`Failed to fetch user: ${userResponse.status}`, { status: 500 })
        }

        const userData = await userResponse.json() as {
            login: string
            name?: string
            avatar_url?: string
        }

        // Set cookies like the real OAuth callback does
        const headers = new Headers()
        headers.set('Location', '/app')
        headers.append('Set-Cookie', `gh_token=${devToken}; HttpOnly; Path=/; Max-Age=2592000`)
        headers.append('Set-Cookie', `gh_user=${encodeURIComponent(JSON.stringify({
            login: userData.login,
            name: userData.name,
            avatar_url: userData.avatar_url,
        }))}; Path=/; Max-Age=2592000`)

        return new Response(null, {
            status: 302,
            headers
        })
    } catch (error) {
        console.error('[dev-login] Error:', error)
        return new Response('Dev login failed', { status: 500 })
    }
}
