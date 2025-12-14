<template>
  <Dialog :open="true">
    <DialogContent class="sm:max-w-md" :class="{ 'opacity-0': false } /* Prevent flickering */" :hide-close="true">
      <!-- Loading -->
      <div v-if="loading" class="text-center py-6">
        <Loader2 class="h-8 w-8 animate-spin mx-auto text-primary" />
        <p class="mt-4 text-muted-foreground">Loading session...</p>
      </div>
      
      <!-- Error -->
      <div v-else-if="error" class="text-center space-y-4 py-4">
        <XCircle class="h-12 w-12 mx-auto text-destructive" />
        <h1 class="text-xl font-semibold text-foreground">{{ error }}</h1>
        <Button @click="router.push('/')" variant="outline">Go Home</Button>
      </div>
      
      <!-- Session Info -->
      <div v-else-if="session" class="space-y-6">
        <DialogHeader>
            <div class="flex justify-center mb-2">
                <Users class="h-16 w-16 text-primary" />
            </div>
            <DialogTitle class="text-center text-xl">Join Session</DialogTitle>
            <DialogDescription class="text-center">
                {{ session.owner }} invited you to collaborate on these files:
            </DialogDescription>
        </DialogHeader>
        
        <!-- Paths in session -->
        <div class="bg-muted/50 rounded-md p-3">
          <div class="max-h-32 overflow-y-auto">
            <ul class="space-y-2">
                <li v-for="path in session.paths" :key="path" class="text-sm font-mono flex items-center gap-3">
                <FileText class="h-7 w-7 text-muted-foreground flex-shrink-0" />
                <span>{{ formatPath(path) }}</span>
                </li>
            </ul>
          </div>
        </div>
        
        <!-- Info Blocks -->
        <div class="space-y-3">
           <h3 class="text-sm font-semibold text-foreground/90 pl-1">Guest Mode:</h3>
           
           <!-- Live Edits -->
           <div class="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
              <Edit3 class="w-8 h-8 text-primary flex-shrink-0" />
              <div class="space-y-1">
                <h4 class="text-sm font-medium">Live Editing</h4>
                <p class="text-xs text-muted-foreground leading-snug">
                  You can edit files in real-time. Changes are synced instantly with the host and other guests.
                </p>
              </div>
            </div>

            <!-- File System -->
            <div class="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
              <HardDrive class="w-8 h-8 text-muted-foreground flex-shrink-0" />
              <div class="space-y-1">
                <h4 class="text-sm font-medium">No File System Access</h4>
                <p class="text-xs text-muted-foreground leading-snug">
                  Files are not written to the original storage, but are saved online and synced to the host.
                </p>
              </div>
            </div>
            
            <!-- Visibility -->
            <div class="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
              <Eye class="w-8 h-8 text-muted-foreground flex-shrink-0" />
              <div class="space-y-1">
                <h4 class="text-sm font-medium">Limited Visibility</h4>
                <p class="text-xs text-muted-foreground leading-snug">
                  Only files explicitly shared by the host are visible to you, unless you have access to the original storage (e.g. GitHub Repo).
                </p>
              </div>
            </div>
        </div>
        
        <!-- Login note -->
        <div class="text-xs text-muted-foreground text-center space-y-1 pt-1 opacity-80">
          <p>Joining requires you to log in to synchronize changes.</p>
        </div>
        
        <DialogFooter>
             <Button @click="joinSession" :disabled="joining" class="w-full">
                {{ joining ? 'Joining...' : 'Join Session' }}
            </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, XCircle, FileText, Edit3, HardDrive, Eye, Users } from 'lucide-vue-next'
import { devFetch } from '@/utils/devTools'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { isAccessAuthenticated, checkAccessAuth } = useAuth()

const emit = defineEmits<{
  'joined': []
}>()

const loading = ref(true)
const joining = ref(false)
const error = ref<string | null>(null)
const session = ref<any>(null)
const permission = ref<string>('edit')

function formatPath(path: string): string {
  const parts = path.split('/')
  if (parts.length === 2) return `${parts[1]} (entire repo)`
  const lastPart = parts.slice(2).join('/')
  if (lastPart.includes('.')) return lastPart
  if (lastPart.endsWith('/*')) return lastPart
  return `${lastPart}/`
}

onMounted(async () => {
  const token = route.params.token as string
  if (!token) { 
      loading.value = false
      return 
  }
  
  try {
    const res = await devFetch(`/share/${token}`, { credentials: 'include' })
    const text = await res.text()
    
    if (!res.headers.get('content-type')?.includes('application/json')) {
      if (text.includes('cloudflare') || text.includes('access')) {
        error.value = 'Share endpoint blocked by Cloudflare Access.'
      } else {
        error.value = 'Unexpected response format'
      }
      return
    }
    
    const data = JSON.parse(text)
    if (!res.ok) {
      error.value = data.error || 'Invalid link'
      return
    }
    
    session.value = data.session
    permission.value = data.permission
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load session'
  } finally {
    loading.value = false
  }
})

async function joinSession() {
  const token = route.params.token as string
  joining.value = true
  
  try {
    await checkAccessAuth()
    
    if (!isAccessAuthenticated.value) {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
      // Redirect to current page (protected by Access) to trigger login
      // Since /s/:token is public in router, we might not trigger Access unless we hit a protected API or route.
      // But checkAccessAuth() calls /api/auth/me which IS protected. 
      // If that returned 401, we need to trigger the flow.
      // Easiest is to bounce to a protected route and back.
      // Or just reload current page? No, that loops if public.
      // We bounce to /app?return_to=...
      window.location.href = `/app?return_to=${returnUrl}`
      return
    }

    const res = await devFetch(`/api/share/${token}`, {
      method: 'POST',
      credentials: 'include'
    })
    
    if (!res.ok) {
      if (res.status === 401) {
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/app?return_to=${returnUrl}`
        return
      }
      const data = await res.json()
      error.value = data.error || 'Failed to join'
      return
    }
    
    const data = await res.json()
    localStorage.setItem('quartier:activeSession', JSON.stringify(data.session))
    
    // Set repo/file logic
    if (data.session.paths.length > 0) {
      const firstPath = data.session.paths[0].replace(/\/\*$/, '')
      const parts = firstPath.split('/')
      if (parts.length >= 2) {
        const repoSlug = `${parts[0]}/${parts[1]}`
        localStorage.setItem('quartier:repo', repoSlug)
        if (parts.length > 2) {
          const filePath = parts.slice(2).join('/')
          if (filePath.includes('.')) {
            localStorage.setItem('quartier:currentFile', JSON.stringify(filePath))
          } else {
             localStorage.removeItem('quartier:currentFile')
          }
        }
      }
    }
    
    emit('joined')
    
  } catch (e) {
    error.value = 'Failed to join session'
  } finally {
    joining.value = false
  }
}
</script>
