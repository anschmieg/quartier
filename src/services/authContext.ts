import { reactive, readonly } from 'vue'
import type { AuthContext } from '@/core/workspace/types'

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
  return match?.[2] ? decodeURIComponent(match[2]) : null
}

const state = reactive<AuthContext>({
  hostUser: null,
  guestUser: null,
  authMode: 'anonymous',
  status: 'idle',
})

let initPromise: Promise<void> | null = null

async function checkAccessAuth() {
  const res = await fetch('/api/auth/me', { credentials: 'include' })
  if (!res.ok) return null
  const data = await res.json() as any
  if (data.user?.email) {
    return {
      email: data.user.email as string,
      name: (data.user.name as string | undefined) || undefined,
    }
  }
  if (data.email) {
    return { email: data.email as string }
  }
  return null
}

export async function initializeAuthContext(): Promise<void> {
  if (initPromise) return initPromise

  initPromise = (async () => {
    state.status = 'loading'
    try {
      const userCookie = getCookie('gh_user')
      if (userCookie) {
        const parsed = JSON.parse(userCookie) as any
        state.hostUser = {
          login: parsed.login,
          name: parsed.name,
          avatarUrl: parsed.avatar_url,
        }
        state.guestUser = null
        state.authMode = 'host-authenticated'
        state.status = 'ready'
        return
      }

      const guest = await checkAccessAuth()
      if (guest) {
        state.hostUser = null
        state.guestUser = guest
        state.authMode = 'guest-authenticated'
      } else {
        state.hostUser = null
        state.guestUser = null
        state.authMode = 'anonymous'
      }
      state.status = 'ready'
    } catch (error) {
      console.error('Failed to initialize auth context:', error)
      state.hostUser = null
      state.guestUser = null
      state.authMode = 'auth-error'
      state.status = 'error'
    } finally {
      initPromise = null
    }
  })()

  return initPromise
}

export function useAuthContextState() {
  return readonly(state)
}

export async function refreshGuestAuthContext(): Promise<void> {
  const guest = await checkAccessAuth().catch(() => null)
  if (guest) {
    state.guestUser = guest
    if (!state.hostUser) state.authMode = 'guest-authenticated'
  } else if (!state.hostUser) {
    state.guestUser = null
    state.authMode = 'anonymous'
  }
}
