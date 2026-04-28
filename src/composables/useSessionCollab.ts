import { ref } from 'vue'
import { sessionBootstrapService } from '@/services/sessionBootstrap'
import { useWorkspaceSession } from './useWorkspaceSession'

export function useSessionCollab() {
  const workspaceSession = useWorkspaceSession()
  const loading = ref(false)
  const error = ref<string | null>(null)

  const joinShareToken = async (token: string) => {
    loading.value = true
    error.value = null
    try {
      const bootstrap = await sessionBootstrapService.join(token)
      await workspaceSession.bootstrapSession(bootstrap)
      workspaceSession.setConnectionState({
        transport: 'partykit',
        status: 'bootstrap',
        lastError: null,
      })
      return bootstrap
    } catch (joinError) {
      error.value = joinError instanceof Error ? joinError.message : 'Failed to join session'
      workspaceSession.setConnectionState({
        transport: 'partykit',
        status: 'failed',
        lastError: error.value,
      })
      return null
    } finally {
      loading.value = false
    }
  }

  const leaveSession = async () => {
    await workspaceSession.setSession(null)
    workspaceSession.setConnectionState({
      transport: 'none',
      status: 'disconnected',
      lastError: null,
    })
  }

  return {
    loading,
    error,
    joinShareToken,
    leaveSession,
  }
}
