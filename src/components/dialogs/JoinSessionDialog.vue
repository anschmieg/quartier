<template>
  <Dialog :open="true">
    <DialogContent class="sm:max-w-md" :class="{ 'opacity-0': false } /* Prevent flickering */" :hide-close="true">
      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-6">
        <LoadingSpinner size="lg" message="Loading session..." />
      </div>
      
      <!-- Error -->
      <ErrorMessage 
        v-else-if="error"
        variant="error"
        :title="error"
        message="Please check the link and try again"
        actionText="Go Home"
        @action="router.push('/')"
        class="py-4"
      />
      
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
                <FileText class="h-7 w-7 text-muted-foreground shrink-0" />
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
              <Edit3 class="w-8 h-8 text-primary shrink-0" />
              <div class="space-y-1">
                <h4 class="text-sm font-medium">Live Editing</h4>
                <p class="text-xs text-muted-foreground leading-snug">
                  You can edit files in real-time. Changes are synced instantly with the host and other guests.
                </p>
              </div>
            </div>

            <!-- File System -->
            <div class="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
              <HardDrive class="w-8 h-8 text-muted-foreground shrink-0" />
              <div class="space-y-1">
                <h4 class="text-sm font-medium">No File System Access</h4>
                <p class="text-xs text-muted-foreground leading-snug">
                  Files are not written to the original storage, but are saved online and synced to the host.
                </p>
              </div>
            </div>
            
            <!-- Visibility -->
            <div class="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
              <Eye class="w-8 h-8 text-muted-foreground shrink-0" />
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
import { FileText, Edit3, HardDrive, Eye, Users } from 'lucide-vue-next'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorMessage } from '@/components/ui/error'
import { useAuth } from '@/composables/useAuth'
import { sessionBootstrapService } from '@/services/sessionBootstrap'
import { useSessionCollab } from '@/composables/useSessionCollab'

const route = useRoute()
const router = useRouter()
const { isAccessAuthenticated, checkAccessAuth } = useAuth()
const sessionCollab = useSessionCollab()

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
    const data = await sessionBootstrapService.preview(token)
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

    const joined = await sessionCollab.joinShareToken(token)
    if (!joined) {
      error.value = sessionCollab.error.value || 'Failed to join'
      return
    }

    emit('joined')
    
  } catch (e) {
    error.value = 'Failed to join session'
  } finally {
    joining.value = false
  }
}
</script>
