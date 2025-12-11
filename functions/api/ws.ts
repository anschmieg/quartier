/**
 * Cloudflare Pages Function for y-websocket compatible WebSocket relay
 * 
 * This handles WebSocket connections for Yjs collaboration.
 * State is stored in Upstash Redis for persistence when clients are offline.
 */

interface Env {
    UPSTASH_REDIS_REST_URL: string
    UPSTASH_REDIS_REST_TOKEN: string
}

// Store active WebSocket connections by room
const rooms = new Map<string, Set<WebSocket>>()

export const onRequest: PagesFunction<Env> = async (context) => {
    const upgradeHeader = context.request.headers.get('Upgrade')

    if (upgradeHeader !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 })
    }

    const url = new URL(context.request.url)
    const roomName = url.searchParams.get('room') || 'default'

    // Create WebSocket pair
    const [client, server] = Object.values(new WebSocketPair())

    // Handle the WebSocket connection
    server.accept()

    // Get or create room
    if (!rooms.has(roomName)) {
        rooms.set(roomName, new Set())
    }
    const room = rooms.get(roomName)!
    room.add(server)

    // Broadcast messages to all clients in the room
    server.addEventListener('message', (event) => {
        const data = event.data
        for (const ws of room) {
            if (ws !== server && ws.readyState === WebSocket.OPEN) {
                ws.send(data)
            }
        }

        // Optionally persist to Upstash for async sync
        // This would be used when clients reconnect after being offline
        persistToUpstash(context.env, roomName, data)
    })

    server.addEventListener('close', () => {
        room.delete(server)
        if (room.size === 0) {
            rooms.delete(roomName)
        }
    })

    server.addEventListener('error', () => {
        room.delete(server)
    })

    return new Response(null, {
        status: 101,
        webSocket: client,
    })
}

async function persistToUpstash(env: Env, roomName: string, data: ArrayBuffer | string) {
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
        return // Skip if not configured
    }

    try {
        // Store the latest update for this room
        // In a production setup, you'd accumulate updates and merge them
        const key = `quartier:room:${roomName}:updates`

        // Convert to base64 for Redis storage
        const value = typeof data === 'string'
            ? data
            : Buffer.from(data).toString('base64')

        await fetch(`${env.UPSTASH_REDIS_REST_URL}/lpush/${key}/${encodeURIComponent(value)}`, {
            headers: {
                Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
            },
        })

        // Keep only last 100 updates per room
        await fetch(`${env.UPSTASH_REDIS_REST_URL}/ltrim/${key}/0/99`, {
            headers: {
                Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
            },
        })
    } catch (error) {
        console.error('Failed to persist to Upstash:', error)
    }
}
