/**
 * Yjs Collaboration Service
 * 
 * Manages Yjs documents for real-time collaboration with:
 * - y-webrtc for peer-to-peer sync (works offline between online peers)
 * - y-indexeddb for local persistence (offline support)
 * - KV sync for async collaboration (different time editing)
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Connection status tracking
 * - Proper cleanup on disconnect
 */

import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { IndexeddbPersistence } from 'y-indexeddb'
import { kvSync } from './storage'

// Store active documents and providers
const documents = new Map<string, Y.Doc>()
const webrtcProviders = new Map<string, WebrtcProvider>()
const indexeddbProviders = new Map<string, IndexeddbPersistence>()

// Connection status tracking
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'
const connectionStatus = new Map<string, ConnectionStatus>()
const statusCallbacks = new Map<string, Set<(status: ConnectionStatus) => void>>()

// Signaling servers configuration
// IMPORTANT: Using public signaling server (yjs.dev) for development only
// TODO: HIGH PRIORITY - Replace with private signaling server for production
// Security considerations:
// - Public server may log room IDs and connections
// - Not guaranteed to be available 24/7
// - No SLA or support
// Recommendation: Deploy y-websocket server on your infrastructure
// See: https://github.com/yjs/y-websocket
const SIGNALING_SERVERS = [
    'wss://signaling.yjs.dev',
    // Add custom signaling server here when available:
    // 'wss://your-domain.com/signaling'
]

export interface CollabUser {
    email: string
    name: string
    color: string
}

/**
 * Generate a consistent color from email (for cursor colors)
 */
function emailToColor(email: string): string {
    let hash = 0
    for (let i = 0; i < email.length; i++) {
        hash = email.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = hash % 360
    return `hsl(${hue}, 70%, 50%)`
}

/**
 * Get or create a Yjs document for a file
 */
export function getYjsDocument(
    owner: string,
    repo: string,
    path: string
): Y.Doc {
    const roomId = `quartier:${owner}/${repo}/${path}`

    let doc = documents.get(roomId)
    if (doc) return doc

    // Create new document
    doc = new Y.Doc()
    documents.set(roomId, doc)

    return doc
}

/**
 * Set connection status and notify listeners
 */
function setConnectionStatus(roomId: string, status: ConnectionStatus) {
    connectionStatus.set(roomId, status)
    const callbacks = statusCallbacks.get(roomId)
    if (callbacks) {
        callbacks.forEach(cb => cb(status))
    }
}

/**
 * Subscribe to connection status changes
 */
export function onConnectionStatusChange(
    owner: string,
    repo: string,
    path: string,
    callback: (status: ConnectionStatus) => void
): () => void {
    const roomId = `quartier:${owner}/${repo}/${path}`
    
    if (!statusCallbacks.has(roomId)) {
        statusCallbacks.set(roomId, new Set())
    }
    
    statusCallbacks.get(roomId)!.add(callback)
    
    // Return unsubscribe function
    return () => {
        statusCallbacks.get(roomId)?.delete(callback)
    }
}

/**
 * Get current connection status
 */
export function getConnectionStatus(owner: string, repo: string, path: string): ConnectionStatus {
    const roomId = `quartier:${owner}/${repo}/${path}`
    return connectionStatus.get(roomId) || 'disconnected'
}

/**
 * Connect a document to collaboration providers with automatic reconnection
 */
export function connectCollab(
    owner: string,
    repo: string,
    path: string,
    user: CollabUser
): {
    doc: Y.Doc
    provider: WebrtcProvider
    awareness: WebrtcProvider['awareness']
} {
    const roomId = `quartier:${owner}/${repo}/${path}`
    const doc = getYjsDocument(owner, repo, path)

    // Setup IndexedDB persistence (local)
    if (!indexeddbProviders.has(roomId)) {
        const idbProvider = new IndexeddbPersistence(roomId, doc)
        indexeddbProviders.set(roomId, idbProvider)
        console.log('[collab] IndexedDB persistence connected:', roomId)
    }

    // Setup WebRTC provider (peer-to-peer)
    let webrtcProvider = webrtcProviders.get(roomId)
    if (!webrtcProvider) {
        setConnectionStatus(roomId, 'connecting')
        
        webrtcProvider = new WebrtcProvider(roomId, doc, {
            signaling: SIGNALING_SERVERS,
            // Enable password protection if needed
            // password: 'your-room-password',
        })
        
        // Track connection status
        webrtcProvider.on('status', (event: { status: string }) => {
            console.log('[collab] WebRTC status:', event.status, roomId)
            if (event.status === 'connected') {
                setConnectionStatus(roomId, 'connected')
            } else if (event.status === 'disconnected') {
                setConnectionStatus(roomId, 'disconnected')
            }
        })
        
        webrtcProvider.on('synced', (synced: boolean) => {
            console.log('[collab] Sync status:', synced, roomId)
        })
        
        webrtcProviders.set(roomId, webrtcProvider)
        console.log('[collab] WebRTC provider connected:', roomId)
    }

    // Set user awareness (for cursors)
    webrtcProvider.awareness.setLocalStateField('user', {
        name: user.name || user.email.split('@')[0],
        email: user.email,
        color: user.color || emailToColor(user.email),
    })

    return {
        doc,
        provider: webrtcProvider,
        awareness: webrtcProvider.awareness,
    }
}

/**
 * Disconnect collaboration for a file with proper cleanup
 */
export function disconnectCollab(owner: string, repo: string, path: string): void {
    const roomId = `quartier:${owner}/${repo}/${path}`

    // Clear awareness state before disconnecting
    const webrtcProvider = webrtcProviders.get(roomId)
    if (webrtcProvider) {
        webrtcProvider.awareness.setLocalState(null)
        webrtcProvider.destroy()
        webrtcProviders.delete(roomId)
    }

    // Cleanup status tracking
    setConnectionStatus(roomId, 'disconnected')
    statusCallbacks.delete(roomId)

    // Keep IndexedDB and doc for quick reconnect
    console.log('[collab] Disconnected:', roomId)
}

/**
 * Cleanup all collaboration resources (for app shutdown)
 */
export function cleanupAllCollaboration(): void {
    console.log('[collab] Cleaning up all collaboration resources')
    
    // Disconnect all WebRTC providers
    webrtcProviders.forEach((provider, roomId) => {
        provider.awareness.setLocalState(null)
        provider.destroy()
    })
    webrtcProviders.clear()
    
    // Close all IndexedDB connections
    indexeddbProviders.forEach((provider) => {
        provider.destroy()
    })
    indexeddbProviders.clear()
    
    // Clear documents
    documents.clear()
    
    // Clear status tracking
    connectionStatus.clear()
    statusCallbacks.clear()
}

/**
 * Save Yjs document state to KV for async collaboration
 */
export async function saveYjsStateToKV(
    owner: string,
    repo: string,
    path: string,
    content: string
): Promise<boolean> {
    const roomId = `quartier:${owner}/${repo}/${path}`
    const doc = documents.get(roomId)

    if (!doc) {
        console.warn('[collab] No document found for:', roomId)
        return kvSync.put(owner, repo, path, content)
    }

    // Export Yjs state as base64
    const state = Y.encodeStateAsUpdate(doc)
    const yjsState = btoa(String.fromCharCode(...state))

    return kvSync.put(owner, repo, path, content, undefined, yjsState)
}

/**
 * Load and merge Yjs state from KV
 */
export async function loadYjsStateFromKV(
    owner: string,
    repo: string,
    path: string
): Promise<{ content: string; merged: boolean } | null> {
    const roomId = `quartier:${owner}/${repo}/${path}`
    const doc = getYjsDocument(owner, repo, path)

    const kvData = await kvSync.get(owner, repo, path)
    if (!kvData) return null

    if (kvData.yjsState) {
        try {
            // Decode and merge Yjs state
            const state = Uint8Array.from(atob(kvData.yjsState), c => c.charCodeAt(0))
            Y.applyUpdate(doc, state)
            console.log('[collab] Merged Yjs state from KV:', roomId)
            return { content: kvData.content, merged: true }
        } catch (error) {
            console.error('[collab] Failed to merge Yjs state:', error)
        }
    }

    return { content: kvData.content, merged: false }
}

/**
 * Get current collaborators in a document
 */
export function getCollaborators(
    owner: string,
    repo: string,
    path: string
): CollabUser[] {
    const roomId = `quartier:${owner}/${repo}/${path}`
    const provider = webrtcProviders.get(roomId)

    if (!provider) return []

    const users: CollabUser[] = []
    provider.awareness.getStates().forEach((state) => {
        if (state.user) {
            users.push({
                email: state.user.email,
                name: state.user.name,
                color: state.user.color,
            })
        }
    })

    return users
}
