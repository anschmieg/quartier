import { ref, onUnmounted } from 'vue'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { WebrtcProvider } from 'y-webrtc'
import { IndexeddbPersistence } from 'y-indexeddb'

export interface CollaborationOptions {
    documentId: string
    /**
     * 'websocket' - Use server-relayed WebSocket (production)
     * 'webrtc' - Use peer-to-peer WebRTC (development)
     * 'auto' - WebSocket in production, WebRTC in development
     */
    mode?: 'websocket' | 'webrtc' | 'auto'
}

/**
 * Get the WebSocket URL for the collaboration server
 */
function getWebSocketUrl(): string {
    // In production, use the same origin with /api/ws
    // In development, fall back to local dev or public signaling
    if (import.meta.env.PROD) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        return `${protocol}//${window.location.host}/api/ws`
    }
    // Use WebRTC signaling for development (no local WS server)
    return ''
}

/**
 * Composable for managing Yjs collaboration providers
 * 
 * Uses y-websocket for production (server-relayed) and
 * y-webrtc for development (peer-to-peer).
 */
export function useCollaboration(options: CollaborationOptions) {
    const { documentId, mode = 'auto' } = options

    const ydoc = new Y.Doc()
    const isSynced = ref(false)
    const isConnected = ref(false)
    const providerType = ref<'websocket' | 'webrtc'>('webrtc')

    // Room name based on document ID
    const roomName = `quartier-${documentId}`

    // IndexedDB persistence (always enabled for offline support)
    const indexeddbProvider = new IndexeddbPersistence(roomName, ydoc)

    indexeddbProvider.on('synced', () => {
        isSynced.value = true
        console.log('[Quartier] Content loaded from IndexedDB')
    })

    // Determine which provider to use
    const useWebSocket = mode === 'websocket' || (mode === 'auto' && import.meta.env.PROD)

    let networkProvider: WebsocketProvider | WebrtcProvider

    if (useWebSocket) {
        // Production: Use WebSocket for server-relayed collaboration
        const wsUrl = getWebSocketUrl()
        providerType.value = 'websocket'

        networkProvider = new WebsocketProvider(wsUrl, roomName, ydoc, {
            params: { room: roomName },
        })

        networkProvider.on('status', (event: { status: string }) => {
            isConnected.value = event.status === 'connected'
            console.log(`[Quartier] WebSocket ${event.status}`)
        })
    } else {
        // Development: Use WebRTC for peer-to-peer collaboration
        providerType.value = 'webrtc'

        networkProvider = new WebrtcProvider(roomName, ydoc, {
            signaling: ['wss://signaling.yjs.dev'],
        })

        // WebRTC doesn't have a simple connected state, assume connected when peers exist
        isConnected.value = true
    }

    // Cleanup on unmount
    onUnmounted(() => {
        networkProvider.destroy()
        indexeddbProvider.destroy()
        ydoc.destroy()
    })

    return {
        ydoc,
        isSynced,
        isConnected,
        providerType,
        roomName,
    }
}
