import { computed, onMounted } from 'vue'
import { initializeAuthContext, refreshGuestAuthContext, useAuthContextState } from '@/services/authContext'

/**
 * Composable for managing GitHub authentication state
 */
export function useAuth() {
    const state = useAuthContextState()

    const isLoading = computed(() => state.status === 'loading' || state.status === 'idle')
    const user = computed(() => state.hostUser ? ({
        login: state.hostUser.login,
        name: state.hostUser.name,
        avatar_url: state.hostUser.avatarUrl,
    }) : null)
    const accessUser = computed(() => state.guestUser ? ({
        email: state.guestUser.email,
        name: state.guestUser.name,
    }) : null)
    const isAuthenticated = computed(() => state.authMode === 'host-authenticated')
    const isAccessAuthenticated = computed(() => state.authMode === 'guest-authenticated' || state.authMode === 'host-authenticated')
    const isHost = computed(() => isAuthenticated.value)
    const isGuest = computed(() => !isAuthenticated.value)

    /**
     * Initialize auth state
     */
    async function init() {
        await initializeAuthContext()
    }

    /**
     * Redirect to GitHub OAuth login
     * In development, uses the dev-login endpoint instead
     */
    function login(returnTo?: string) {
        // In development, use the dev-login endpoint
        if (import.meta.env.DEV) {
            window.location.href = '/api/oauth/dev-login'
            return
        }

        const url = new URL('/api/oauth/login', window.location.origin)
        if (returnTo) {
            url.searchParams.set('return_to', returnTo)
        }
        window.location.href = url.toString()
    }

    /**
     * Logout and clear cookies
     */
    async function logout() {
        try {
            await fetch('/api/oauth/logout', { method: 'POST' })
            // Redirect to home or reload
            window.location.href = '/'
        } catch (error) {
            console.error('Logout failed:', error)
        }
    }

    // Load user on composable init
    onMounted(() => {
        init()
    })

    return {
        user,
        accessUser,
        isLoading,
        isAuthenticated,
        isAccessAuthenticated,
        isHost,
        isGuest,
        login,
        logout,
        loadUser: init,
        checkAccessAuth: refreshGuestAuthContext
    }
}
