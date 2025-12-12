/**
 * Logout handler - clears auth cookies
 */

export const onRequestPost: PagesFunction = async (context) => {
    const url = new URL(context.request.url)
    const returnTo = url.searchParams.get('return_to') || '/'

    const headers = new Headers()
    headers.set('Location', returnTo)
    headers.append('Set-Cookie', 'gh_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0')
    headers.append('Set-Cookie', 'gh_user=; Secure; SameSite=Lax; Path=/; Max-Age=0')

    return new Response(null, {
        status: 302,
        headers
    })
}
