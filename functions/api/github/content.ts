/**
 * Fetch repository contents from GitHub
 * GET /api/github/content?owner=xxx&repo=xxx&path=xxx&session=xxx
 * 
 * Access Control (Deny-by-Default):
 * - Has gh_token cookie → Full access (authenticated owner/collaborator)
 * - No token + has session → Filtered to session.paths only
 * - No token + no session → 403 Forbidden
 */

import { checkRateLimit, createErrorResponse } from '../../utils/validation'

interface Session {
    id: string
    owner: string
    paths: string[]
    members: string[]
    created: number
}

interface Env {
    QUARTIER_KV: KVNamespace
    DEV_GITHUB_TOKEN?: string
    DEV_USER_EMAIL?: string
}

/**
 * Check if a path is allowed by session paths
 * Session paths can be: owner/repo/* (entire repo), owner/repo/folder/* (folder), owner/repo/file.md (file)
 */
function isPathAllowed(requestedPath: string, sessionPaths: string[], owner: string, repo: string): boolean {
    const fullPath = `${owner}/${repo}/${requestedPath}`.replace(/\/+/g, '/')

    for (const allowed of sessionPaths) {
        // Normalize the allowed path
        const normalizedAllowed = allowed.replace(/\/+/g, '/')

        // Entire repo access
        if (normalizedAllowed === `${owner}/${repo}` || normalizedAllowed === `${owner}/${repo}/*`) {
            return true
        }

        // Wildcard folder access (e.g., owner/repo/src/*)
        if (normalizedAllowed.endsWith('/*')) {
            const prefix = normalizedAllowed.slice(0, -1) // Remove the *
            if (fullPath.startsWith(prefix) || fullPath === prefix.slice(0, -1)) {
                return true
            }
        }

        // Exact file match
        if (fullPath === normalizedAllowed) {
            return true
        }

        // Requesting a parent directory of an allowed path (for directory listing)
        // Handle empty path (root) case
        const pathToCheck = requestedPath ? fullPath + '/' : `${owner}/${repo}/`
        if (normalizedAllowed.startsWith(pathToCheck)) {
            return true
        }
    }

    return false
}

/**
 * Filter directory listing to only show items within allowed paths
 * This ensures guests only see files/folders on the way to or within allowed paths
 */
function filterDirectoryListing(items: any[], sessionPaths: string[], owner: string, repo: string, currentPath: string): any[] {
    const prefix = `${owner}/${repo}/`

    return items.filter(item => {
        const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name
        const fullItemPath = `${prefix}${itemPath}`.replace(/\/+/g, '/')

        for (const allowed of sessionPaths) {
            const normalizedAllowed = allowed.replace(/\/+/g, '/')

            // Case 1: Item is within allowed path (e.g., src/components/* allows src/components/Button.vue)
            if (normalizedAllowed.endsWith('/*')) {
                const allowedPrefix = normalizedAllowed.slice(0, -1) // Remove *
                if (fullItemPath.startsWith(allowedPrefix)) {
                    return true
                }
            }

            // Case 2: Item matches exactly
            if (fullItemPath === normalizedAllowed) {
                return true
            }

            // Case 3: Item is a directory on the path to an allowed location
            // e.g., when at root listing "src" and allowed is "owner/repo/src/components/*"
            if (normalizedAllowed.startsWith(fullItemPath + '/')) {
                return true
            }
        }

        return false
    })
}

/**
 * Get user email from request (Cloudflare Access or dev override)
 */
function getUserEmail(context: EventContext<Env, any, any>): string | null {
    // Check for dev user override header (local development only)
    const devUserOverride = context.request.headers.get('x-dev-user')
    if (devUserOverride === 'none') return null
    if (devUserOverride) return devUserOverride

    return context.request.headers.get('cf-access-authenticated-user-email')
        || context.env.DEV_USER_EMAIL
        || null
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url)
    const owner = url.searchParams.get('owner')
    const repo = url.searchParams.get('repo')
    const path = url.searchParams.get('path') || ''
    const sessionId = url.searchParams.get('session')

    if (!owner || !repo) {
        return new Response('Missing owner or repo parameter', { status: 400 })
    }

    // Check for user's own GitHub token (authenticated owner/collaborator)
    const cookieHeader = context.request.headers.get('Cookie')
    const tokenMatch = cookieHeader ? cookieHeader.match(/(^| )gh_token=([^;]+)/) : null
    let accessToken = tokenMatch ? tokenMatch[2] : null

    // Fallback for local development
    if (!accessToken && context.env.DEV_GITHUB_TOKEN) {
        accessToken = context.env.DEV_GITHUB_TOKEN
    }

    let session: Session | null = null
    let isGuest = false

    // If user has their own token, they get full access
    if (accessToken && !sessionId) {
        // User has token = authenticated, full access
        isGuest = false
    } else if (sessionId) {
        // Guest flow - verify session
        session = await context.env.QUARTIER_KV.get(`session:${sessionId}`, 'json') as Session | null

        if (!session) {
            return new Response(JSON.stringify({ error: 'Invalid session' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const userEmail = getUserEmail(context)

        // Check if user is session owner or member
        const isOwner = session.owner === userEmail
        const isMember = session.members.includes(userEmail || '')

        if (!isOwner && !isMember) {
            return new Response(JSON.stringify({ error: 'Not a member of this session' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Check if path is within session.paths (skip for owner)
        if (!isOwner && !isPathAllowed(path, session.paths, owner, repo)) {
            return new Response(JSON.stringify({ error: 'Access denied to this path' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        isGuest = !isOwner // All non-owners get filtered view

        // Use owner's token for guests (stored in session or fallback to dev token)
        if (!accessToken && context.env.DEV_GITHUB_TOKEN) {
            accessToken = context.env.DEV_GITHUB_TOKEN
        }
    } else {
        // No token and no session = unauthorized
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    if (!accessToken) {
        return new Response(JSON.stringify({ error: 'No valid access token' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    // Rate limiting is now handled by _middleware.ts
    
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

        let data = await response.json()

        // Filter directory listing for guests with session
        if (session && isGuest && Array.isArray(data)) {
            data = filterDirectoryListing(data, session.paths, owner, repo, path)
        }

        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('GitHub API error:', error)
        return new Response('Failed to fetch repository contents', { status: 500 })
    }
}
