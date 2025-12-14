<template>
  <div class="min-h-screen bg-background flex items-center justify-center p-4">
    <div class="w-full max-w-md space-y-6">
      <!-- Loading -->
      <div v-if="loading" class="text-center">
        <Loader2 class="h-8 w-8 animate-spin mx-auto text-primary" />
        <p class="mt-4 text-muted-foreground">Loading session...</p>
      </div>
      
      <!-- Error -->
      <div v-else-if="error" class="text-center space-y-4">
        <XCircle class="h-12 w-12 mx-auto text-destructive" />
        <h1 class="text-xl font-semibold">{{ error }}</h1>
        <Button @click="$router.push('/')">Go Home</Button>
      </div>
      
      <!-- Session Info -->
      <div v-else-if="session" class="bg-card border rounded-lg p-6 space-y-4">
        <div class="text-center space-y-2">
          <FileText class="h-10 w-10 mx-auto text-primary" />
          <h1 class="text-xl font-semibold">Join Session</h1>
          <p class="text-sm text-muted-foreground">
            {{ session.owner }} invited you to collaborate
          </p>
        </div>
        
        <!-- Paths in session -->
        <div class="bg-muted rounded-md p-3">
          <p class="text-xs text-muted-foreground mb-2">Shared paths:</p>
          <ul class="space-y-1">
            <li v-for="path in session.paths" :key="path" class="text-sm font-mono flex items-center gap-2">
              <FileText class="h-4 w-4 text-muted-foreground" />
              {{ formatPath(path) }}
            </li>
          </ul>
        </div>
        
        <!-- Permission badge -->
        <div class="flex justify-center">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
            {{ permission === 'edit' ? 'Can edit' : 'View only' }}
          </span>
        </div>
        
        <!-- Login note -->
        <div class="text-xs text-muted-foreground text-center space-y-1 pt-2">
          <p>Joining requires a GitHub login to:</p>
          <ul class="text-left inline-block">
            <li>• Track your edits and contributions</li>
            <li>• Sync changes to the repository</li>
          </ul>
        </div>
        
        <!-- Join button -->
        <Button @click="joinSession" :disabled="joining" class="w-full">
          {{ joining ? 'Joining...' : 'Join Session' }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Loader2, XCircle, FileText } from 'lucide-vue-next'
import { devFetch } from '@/utils/devTools'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { isAccessAuthenticated, checkAccessAuth } = useAuth()

const loading = ref(true)
const joining = ref(false)
const error = ref<string | null>(null)
const session = ref<any>(null)
const permission = ref<string>('edit')

/**
 * Format a path for display
 * owner/repo → repo (entire repo)
 * owner/repo/folder → folder/ 
 * owner/repo/folder/* → folder/*
 * owner/repo/file.md → file.md
 */
function formatPath(path: string): string {
  const parts = path.split('/')
  if (parts.length === 2) return `${parts[1]} (entire repo)`
  const lastPart = parts.slice(2).join('/')
  if (lastPart.includes('.')) return lastPart // File
  if (lastPart.endsWith('/*')) return lastPart // Wildcard
  return `${lastPart}/` // Folder
}

onMounted(async () => {
  const token = route.params.token as string
  
  try {
    console.log('[JoinPage] Fetching share token:', token)
    const res = await devFetch(`/share/${token}`, {
      credentials: 'include'
    })
    
    console.log('[JoinPage] Response status:', res.status)
    console.log('[JoinPage] Content-Type:', res.headers.get('content-type'))
    
    // Read as text first to debug
    const text = await res.text()
    console.log('[JoinPage] Response text (first 200 chars):', text.substring(0, 200))
    
    // Check if response is JSON
    if (!res.headers.get('content-type')?.includes('application/json')) {
      // Likely Cloudflare Access HTML page
      if (text.includes('cloudflare') || text.includes('access')) {
        error.value = 'Share endpoint blocked by Cloudflare Access. Check Access policy for /share/'
      } else {
        error.value = 'Unexpected response format'
      }
      return
    }
    
    const data = JSON.parse(text)
    
    if (!res.ok) {
      console.log('[JoinPage] Error response:', data)
      error.value = data.error || 'Invalid link'
      return
    }
    
    console.log('[JoinPage] Success:', data)
    session.value = data.session
    permission.value = data.permission
  } catch (e) {
    console.error('[JoinPage] Catch error:', e)
    error.value = e instanceof Error ? e.message : 'Failed to load session'
  } finally {
    loading.value = false
  }
})

async function joinSession() {
  const token = route.params.token as string
  joining.value = true
  
  try {
    // 1. Check if we are authenticated (Cloudflare Access)
    await checkAccessAuth()
    
    // 2. If not authenticated, redirect to trigger Cloudflare Login flow
    // We redirect to /app but include return_to so we come back here
    if (!isAccessAuthenticated.value) {
      const returnUrl = encodeURIComponent(window.location.pathname)
      window.location.href = `/app?return_to=${returnUrl}`
      return
    }

    // 3. If authenticated, call the protected API to join
    const res = await devFetch(`/api/share/${token}`, {
      method: 'POST',
      credentials: 'include'
    })
    
    if (!res.ok) {
      const data = await res.json()
      
      // If not authenticated, redirect to protected route to trigger Cloudflare Access login
      if (res.status === 401) {
        const returnUrl = encodeURIComponent(window.location.pathname)
        // Redirect to /app which is protected. Cloudflare will intercept -> Login -> /app
        // We add return_to so the app knows to send us back here
        window.location.href = `/app?return_to=${returnUrl}`
        return
      }
      
      error.value = data.error || 'Failed to join'
      return
    }
    
    const data = await res.json()
    
    // Store session in localStorage and redirect to app
    localStorage.setItem('quartier:activeSession', JSON.stringify(data.session))
    
    // Redirect based on first path
    if (data.session.paths.length > 0) {
      const firstPath = data.session.paths[0].replace(/\/\*$/, '') // Remove trailing /*
      // Parse owner/repo from path
      const parts = firstPath.split('/')
      if (parts.length >= 2) {
        localStorage.setItem('quartier:repo', `${parts[0]}/${parts[1]}`)
        // If it's a specific file (has extension), set it as current file
        if (parts.length > 2) {
          const filePath = parts.slice(2).join('/')
          if (filePath.includes('.')) {
            localStorage.setItem('quartier:currentFile', JSON.stringify(filePath))
          }
        }
      }
    }
    
    router.push('/app')
  } catch (e) {
    error.value = 'Failed to join session'
  } finally {
    joining.value = false
  }
}
</script>
