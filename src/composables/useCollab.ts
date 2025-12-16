import { type Editor } from '@milkdown/kit/core'
import { collab, collabServiceCtx } from '@milkdown/plugin-collab'
import * as Y from 'yjs'
import YPartyKitProvider from 'y-partykit/provider'
import { updateAwarenessState, clearAwarenessState } from '@/composables/useAwareness'
// @ts-ignore
import { watchEffect } from 'vue'

// Always register the plugin - it does nothing until connected
export const getCollabPlugins = () => [collab]

export function useCollab(
    roomId: string | undefined,
    userEmail: string | undefined,
    getEditor: () => Editor | undefined,
    initialContent: string,
    isCollabEnabled: () => boolean
) {
    // Reset awareness on unmount is handled by provider destruction

    // Use watchEffect to handle setup/teardown based on enabled state
    watchEffect((onCleanup) => {
        // 1. Check if we should be connected
        if (!isCollabEnabled()) {
            return
        }

        const editor = getEditor()
        // Need editor and room ID to proceed
        if (!editor || !roomId) return

        console.log('[Collab] Initializing for room:', roomId)

        // 2. Create Yjs Doc and Provider
        const ydoc = new Y.Doc()

        // Setup PartyKit provider 
        // Host: localhost:1999 (dev) or quartier-collab.partykit.dev (prod)
        const host = import.meta.env.DEV ? 'localhost:1999' : 'quartier-collab.partykit.dev'

        const partyProvider = new YPartyKitProvider(
            host,
            roomId,
            ydoc,
            {
                connect: false, // Wait for manual connect
            }
        )

        // 3. Setup Awareness
        if (userEmail) {
            const hue = userEmail.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % 360
            partyProvider.awareness.setLocalStateField('user', {
                name: userEmail.split('@')[0],
                email: userEmail,
                color: `hsl(${hue}, 70%, 50%)`,
            })
        }

        // Listen for awareness changes
        const awarenessHandler = () => {
            updateAwarenessState(
                partyProvider.awareness.getStates(),
                partyProvider.awareness.clientID
            )
        }
        partyProvider.awareness.on('change', awarenessHandler)

        // Initial update
        updateAwarenessState(
            partyProvider.awareness.getStates(),
            partyProvider.awareness.clientID
        )

        // 4. Bind to Editor
        try {
            editor.action((ctx) => {
                const collabService = ctx.get(collabServiceCtx)
                collabService
                    .bindDoc(ydoc)
                    .setAwareness(partyProvider.awareness)
                    .connect()

                // Apply initial content as template
                // This ensures Yjs doc starts with file content
                collabService.applyTemplate(initialContent)

                // Connect to server
                partyProvider.connect()
                console.log('[Collab] Connected to PartyKit:', host)
            })
        } catch (error) {
            console.error('[Collab] Connection failed:', error)
        }

        // 5. Cleanup function
        onCleanup(() => {
            console.log('[Collab] Disconnecting...')
            partyProvider.disconnect()
            partyProvider.awareness.off('change', awarenessHandler)
            partyProvider.destroy()
            ydoc.destroy()
            clearAwarenessState()
        })
    })
}
