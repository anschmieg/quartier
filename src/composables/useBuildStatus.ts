import { ref, computed, onUnmounted } from 'vue'

export interface BuildStatus {
    step: 'lint' | 'code' | 'build' | 'deploy'
    status: 'started' | 'success' | 'failure'
    repo: string
    message?: string
    url?: string
    timestamp?: number
}

/**
 * Composable for polling GitHub Actions build status
 */
export function useBuildStatus(repo: string) {
    const status = ref<BuildStatus | null>(null)
    const isPolling = ref(false)
    const error = ref<string | null>(null)

    const isBuilding = computed(() =>
        status.value?.status === 'started'
    )

    const isSuccess = computed(() =>
        status.value?.status === 'success'
    )

    const isFailure = computed(() =>
        status.value?.status === 'failure'
    )

    const stepLabel = computed(() => {
        switch (status.value?.step) {
            case 'lint': return 'Linting'
            case 'code': return 'Running code'
            case 'build': return 'Building'
            case 'deploy': return 'Deploying'
            default: return 'Unknown'
        }
    })

    let pollInterval: ReturnType<typeof setInterval> | null = null

    /**
     * Fetch current build status from webhook endpoint
     */
    async function fetchStatus() {
        if (!repo) return

        try {
            const response = await fetch(`/api/webhook?repo=${encodeURIComponent(repo)}`)

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }

            const data = await response.json()

            if (data.status !== 'unknown') {
                status.value = data as BuildStatus
            }

            error.value = null
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to fetch status'
        }
    }

    /**
     * Start polling for build status
     */
    function startPolling(intervalMs = 5000) {
        if (isPolling.value) return

        isPolling.value = true
        fetchStatus() // Fetch immediately

        pollInterval = setInterval(fetchStatus, intervalMs)
    }

    /**
     * Stop polling
     */
    function stopPolling() {
        if (pollInterval) {
            clearInterval(pollInterval)
            pollInterval = null
        }
        isPolling.value = false
    }

    // Cleanup on unmount
    onUnmounted(() => {
        stopPolling()
    })

    return {
        status,
        isPolling,
        error,
        isBuilding,
        isSuccess,
        isFailure,
        stepLabel,
        fetchStatus,
        startPolling,
        stopPolling,
    }
}
