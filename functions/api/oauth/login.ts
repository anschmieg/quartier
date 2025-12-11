/**
 * GitHub OAuth login initiator
 * 
 * Redirects to GitHub's authorization page with the correct scopes.
 */

interface Env {
    GITHUB_CLIENT_ID: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url)
    const returnTo = url.searchParams.get('return_to') || '/'

    const authUrl = new URL('https://github.com/login/oauth/authorize')
    authUrl.searchParams.set('client_id', context.env.GITHUB_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', `${url.origin}/api/oauth/callback`)
    authUrl.searchParams.set('scope', 'repo') // Full repo access for reading/writing files
    authUrl.searchParams.set('state', returnTo)

    return Response.redirect(authUrl.toString(), 302)
}
