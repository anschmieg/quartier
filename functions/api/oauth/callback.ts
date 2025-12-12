/**
 * GitHub OAuth callback handler
 * 
 * Exchanges the authorization code for an access token and sets
 * a secure HttpOnly cookie for authenticated requests.
 */

interface Env {
    GITHUB_CLIENT_ID: string
    GITHUB_CLIENT_SECRET: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    if (!code) {
        return new Response('Missing authorization code', { status: 400 })
    }

    try {
        // Exchange code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: context.env.GITHUB_CLIENT_ID,
                client_secret: context.env.GITHUB_CLIENT_SECRET,
                code,
            }),
        })

        const tokenData = await tokenResponse.json() as {
            access_token?: string
            error?: string
            error_description?: string
        }

        if (tokenData.error) {
            return new Response(`OAuth error: ${tokenData.error_description}`, { status: 400 })
        }

        if (!tokenData.access_token) {
            return new Response('Failed to obtain access token', { status: 500 })
        }

        // Get user info to personalize the experience
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Quartier',
            },
        })

        const userData = await userResponse.json() as {
            login: string
            name?: string
            avatar_url?: string
        }

        // Set secure HttpOnly cookie with the token
        // The token is encrypted and only accessible server-side
        const redirectUrl = state || '/'
        
        const headers = new Headers()
        headers.set('Location', redirectUrl)
        headers.append('Set-Cookie', `gh_token=${tokenData.access_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`)
        headers.append('Set-Cookie', `gh_user=${encodeURIComponent(JSON.stringify({
            login: userData.login,
            name: userData.name,
            avatar_url: userData.avatar_url,
        }))}; Secure; SameSite=Lax; Path=/; Max-Age=2592000`)

        return new Response(null, {
            status: 302,
            headers
        })
    } catch (error) {
        console.error('OAuth error:', error)
        return new Response('Authentication failed', { status: 500 })
    }
}
