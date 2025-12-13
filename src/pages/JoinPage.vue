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
        
        <!-- Files in session -->
        <div class="bg-muted rounded-md p-3">
          <p class="text-xs text-muted-foreground mb-2">Files to edit:</p>
          <ul class="space-y-1">
            <li v-for="file in session.files" :key="file" class="text-sm font-mono flex items-center gap-2">
              <FileText class="h-4 w-4 text-muted-foreground" />
              {{ file.split('/').pop() }}
            </li>
          </ul>
        </div>
        
        <!-- Permission badge -->
        <div class="flex justify-center">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
            {{ permission === 'edit' ? 'Can edit' : 'View only' }}
          </span>
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

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const joining = ref(false)
const error = ref<string | null>(null)
const session = ref<any>(null)
const permission = ref<string>('edit')

onMounted(async () => {
  const token = route.params.token as string
  
  try {
    const res = await fetch(`/api/share/${token}`, {
      credentials: 'include'
    })
    
    if (!res.ok) {
      const data = await res.json()
      error.value = data.error || 'Invalid link'
      return
    }
    
    const data = await res.json()
    session.value = data.session
    permission.value = data.permission
  } catch (e) {
    error.value = 'Failed to load session'
  } finally {
    loading.value = false
  }
})

async function joinSession() {
  const token = route.params.token as string
  joining.value = true
  
  try {
    const res = await fetch(`/api/share/${token}`, {
      method: 'POST',
      credentials: 'include'
    })
    
    if (!res.ok) {
      const data = await res.json()
      error.value = data.error || 'Failed to join'
      return
    }
    
    const data = await res.json()
    
    // Store session in localStorage and redirect to app
    localStorage.setItem('quartier:activeSession', JSON.stringify(data.session))
    
    // Redirect to first file
    if (data.session.files.length > 0) {
      const file = data.session.files[0]
      // Parse owner/repo from file path
      const parts = file.split('/')
      if (parts.length >= 3) {
        localStorage.setItem('quartier:repo', `${parts[0]}/${parts[1]}`)
        localStorage.setItem('quartier:currentFile', JSON.stringify(parts.slice(2).join('/')))
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
