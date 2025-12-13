/**
 * Auth endpoint - returns the authenticated user info
 * Uses Cloudflare Access headers to identify the user
 */

interface Env {
    // Add KV binding here later
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const email = context.request.headers.get('cf-access-authenticated-user-email')

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
