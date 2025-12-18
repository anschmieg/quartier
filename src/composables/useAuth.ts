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
    const accessUser = ref<{ email: string } | null>(null)
    const isLoading = ref(true)

    const isAuthenticated = computed(() => user.value !== null)
    const isAccessAuthenticated = computed(() => accessUser.value !== null)
    const isHost = computed(() => isAuthenticated.value)
    const isGuest = computed(() => !isAuthenticated.value)

    /**
     * Load user from cookie on mount
     */
    function loadUser() {
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
    }

    /**
     * Check Cloudflare Access identity
     */
    async function checkAccessAuth() {
        try {
            const res = await fetch('/api/auth/me', { credentials: 'include' })
            if (res.ok) {
                const data = await res.json() as any
                if (data.user?.email) {
                    accessUser.value = { email: data.user.email }
                } else if (data.email) {
                    // Fallback in case API changes
                    accessUser.value = { email: data.email }
                }
            }
        } catch (e) {
            console.error('Failed to check access auth:', e)
        }
    }

    /**
     * Initialize auth state
     */
    async function init() {
        isLoading.value = true
        loadUser()
        if (!user.value) {
            await checkAccessAuth()
        }
        isLoading.value = false
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
            user.value = null
            accessUser.value = null
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
        loadUser,
        checkAccessAuth
    }
}
