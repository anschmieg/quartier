/**
 * Logout handler - clears auth cookies
 */

export const onRequestPost: PagesFunction = async (context) => {
    const url = new URL(context.request.url)
    const returnTo = url.searchParams.get('return_to') || '/'

    return new Response(null, {
        status: 302,
        headers: {
            'Location': returnTo,
            'Set-Cookie': [
                'gh_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
                'gh_user=; Secure; SameSite=Strict; Path=/; Max-Age=0',
            ].join(', '),
        },
    })
}
