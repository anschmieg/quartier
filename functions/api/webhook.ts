/**
 * GitHub Actions webhook receiver
 * 
 * Receives status updates from GitHub Actions workflow and stores
 * them in Upstash for the browser to poll.
 */

interface Env {
    QUARTIER_WEBHOOK_SECRET: string
    UPSTASH_REDIS_REST_URL: string
    UPSTASH_REDIS_REST_TOKEN: string
}

interface WebhookPayload {
    step: 'lint' | 'code' | 'build' | 'deploy'
    status: 'started' | 'success' | 'failure'
    repo: string
    message?: string
    url?: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    // Verify webhook secret
    const authHeader = context.request.headers.get('Authorization')
    const expectedToken = `Bearer ${context.env.QUARTIER_WEBHOOK_SECRET}`

    if (authHeader !== expectedToken) {
        return new Response('Unauthorized', { status: 401 })
    }

    try {
        const payload = await context.request.json() as WebhookPayload

        // Validate required fields
        if (!payload.step || !payload.status || !payload.repo) {
            return new Response('Invalid payload', { status: 400 })
        }

        // Store in Upstash with TTL
        const key = `quartier:build:${payload.repo}`
        const value = JSON.stringify({
            ...payload,
            timestamp: Date.now(),
        })

        // Store current status
        await fetch(`${context.env.UPSTASH_REDIS_REST_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}/ex/3600`, {
            headers: {
                Authorization: `Bearer ${context.env.UPSTASH_REDIS_REST_TOKEN}`,
            },
        })

        // Also push to a list for history
        const historyKey = `quartier:build:${payload.repo}:history`
        await fetch(`${context.env.UPSTASH_REDIS_REST_URL}/lpush/${encodeURIComponent(historyKey)}/${encodeURIComponent(value)}`, {
            headers: {
                Authorization: `Bearer ${context.env.UPSTASH_REDIS_REST_TOKEN}`,
            },
        })

        // Keep only last 50 history items
        await fetch(`${context.env.UPSTASH_REDIS_REST_URL}/ltrim/${encodeURIComponent(historyKey)}/0/49`, {
            headers: {
                Authorization: `Bearer ${context.env.UPSTASH_REDIS_REST_TOKEN}`,
            },
        })

        return new Response(JSON.stringify({ received: true }), {
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('Webhook error:', error)
        return new Response('Internal error', { status: 500 })
    }
}

// Also allow GET to check build status from browser
export const onRequestGet: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url)
    const repo = url.searchParams.get('repo')

    if (!repo) {
        return new Response('Missing repo parameter', { status: 400 })
    }

    if (!context.env.UPSTASH_REDIS_REST_URL || !context.env.UPSTASH_REDIS_REST_TOKEN) {
        console.error('Missing Upstash configuration')
        return new Response('Missing Upstash configuration. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.', { status: 500 })
    }

    try {
        const key = `quartier:build:${repo}`
        const upstreamUrl = `${context.env.UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`
        
        const response = await fetch(upstreamUrl, {
            headers: {
                Authorization: `Bearer ${context.env.UPSTASH_REDIS_REST_TOKEN}`,
            },
        })

        if (!response.ok) {
            throw new Error(`Upstash returned ${response.status}: ${response.statusText}`)
        }

        const data = await response.json() as { result: string | null }

        if (data.result) {
            return new Response(data.result, {
                headers: { 'Content-Type': 'application/json' },
            })
        }

        // Return empty status structure if not found (not an error)
        return new Response(JSON.stringify({ status: 'unknown' }), {
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('Webhook GET error:', error)
        return new Response(JSON.stringify({ error: 'Failed to fetch status', details: error instanceof Error ? error.message : String(error) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
}
