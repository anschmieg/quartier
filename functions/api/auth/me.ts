/**
 * Auth endpoint - returns the authenticated user info
 * Uses Cloudflare Access headers to identify the user
 * Falls back to DEV_USER_EMAIL for local development
 */

interface Env {
    DEV_GITHUB_TOKEN?: string
    DEV_USER_EMAIL?: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    let email = context.request.headers.get('cf-access-authenticated-user-email')

    // Fallback for local development
    if (!email && context.env.DEV_GITHUB_TOKEN && context.env.DEV_USER_EMAIL) {
        email = context.env.DEV_USER_EMAIL
    }

    if (!email) {
        return new Response(JSON.stringify({ error: 'Not authenticated' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    // Extract name from email (before @) as fallback
    const name = email.split('@')[0]

    return new Response(JSON.stringify({
        user: {
            email,
            name
        }
    }), {
        headers: { 'Content-Type': 'application/json' }
    })
}

