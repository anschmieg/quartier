import { ref, computed, onMounted } from 'vue'

/**
 * GitHub user info stored in cookie
 */
export interface GitHubUser {
    login: string
    name?: string
    avatar_url?: string
}

/**
 * Parse a cookie value by name
 */
function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
    return match?.[2] ? decodeURIComponent(match[2]) : null
}

/**
 * Composable for managing GitHub authentication state
 */
export function useAuth() {
    const user = ref<GitHubUser | null>(null)
    const isLoading = ref(true)

    const isAuthenticated = computed(() => user.value !== null)
    const isHost = computed(() => isAuthenticated.value)
    const isGuest = computed(() => !isAuthenticated.value)

    /**
     * Load user from cookie on mount
     */
    function loadUser() {
        isLoading.value = true
        try {
            const userCookie = getCookie('gh_user')
            if (userCookie) {
                user.value = JSON.parse(userCookie) as GitHubUser
            } else {
                user.value = null
            }
        } catch (error) {
            console.error('Failed to parse user cookie:', error)
            user.value = null
        }
        isLoading.value = false
    }

    /**
     * Redirect to GitHub OAuth login
     */
    function login(returnTo?: string) {
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
            user.value = null
            // Redirect to home or reload
            window.location.href = '/'
        } catch (error) {
            console.error('Logout failed:', error)
        }
    }

    // Load user on composable init
    onMounted(() => {
        loadUser()
    })

    return {
        user,
        isLoading,
        isAuthenticated,
        isHost,
        isGuest,
        login,
        logout,
        loadUser,
    }
}
