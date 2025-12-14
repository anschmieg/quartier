/**
 * Awareness Store
 * 
 * Tracks connected collaborators across the app using a simple reactive store.
 * Updated by the editor when Yjs awareness changes.
 */

import { ref, computed } from 'vue'

export interface CollaboratorUser {
    clientId: number
    name: string
    email: string
    color: string
}

// Reactive state
const connectedUsers = ref<Map<number, CollaboratorUser>>(new Map())
const localClientId = ref<number | null>(null)

/**
 * Update the awareness state (called by editor)
 */
export function updateAwarenessState(
    states: Map<number, { user?: { name: string; email: string; color: string } }>,
    myClientId: number
) {
    localClientId.value = myClientId

    const newUsers = new Map<number, CollaboratorUser>()
    states.forEach((state, clientId) => {
        if (state.user) {
            newUsers.set(clientId, {
                clientId,
                name: state.user.name,
                email: state.user.email,
                color: state.user.color,
            })
        }
    })
    connectedUsers.value = newUsers
}

/**
 * Clear awareness state (called on disconnect)
 */
export function clearAwarenessState() {
    connectedUsers.value = new Map()
    localClientId.value = null
}

/**
 * Get all connected users (excluding self)
 */
export function useAwareness() {
    const otherUsers = computed(() => {
        const users: CollaboratorUser[] = []
        connectedUsers.value.forEach((user, clientId) => {
            if (clientId !== localClientId.value) {
                users.push(user)
            }
        })
        return users
    })

    const allUsers = computed(() =>
        Array.from(connectedUsers.value.values())
    )

    const userCount = computed(() =>
        connectedUsers.value.size
    )

    return {
        otherUsers,
        allUsers,
        userCount,
    }
}
