/**
 * Yjs Collaboration Service
 * 
 * Manages Yjs documents for real-time collaboration with:
 * - y-webrtc for peer-to-peer sync (works offline between online peers)
 * - y-indexeddb for local persistence (offline support)
 * - KV sync for async collaboration (different time editing)
 */

import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { IndexeddbPersistence } from 'y-indexeddb'
import { kvSync } from './storage'

// Store active documents and providers
const documents = new Map<string, Y.Doc>()
const webrtcProviders = new Map<string, WebrtcProvider>()
const indexeddbProviders = new Map<string, IndexeddbPersistence>()

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
 * Connect a document to collaboration providers
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
        webrtcProvider = new WebrtcProvider(roomId, doc, {
            signaling: ['wss://signaling.yjs.dev'], // Public signaling server
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
 * Disconnect collaboration for a file
 */
export function disconnectCollab(owner: string, repo: string, path: string): void {
    const roomId = `quartier:${owner}/${repo}/${path}`

    const webrtcProvider = webrtcProviders.get(roomId)
    if (webrtcProvider) {
        webrtcProvider.destroy()
        webrtcProviders.delete(roomId)
    }

    // Keep IndexedDB and doc for quick reconnect
    console.log('[collab] Disconnected:', roomId)
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
