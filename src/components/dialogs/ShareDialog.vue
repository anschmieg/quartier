<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Share this file</DialogTitle>
        <DialogDescription>
          Create a link to share this file with collaborators.
        </DialogDescription>
      </DialogHeader>
      
      <div class="space-y-4">
        <!-- Current file -->
        <div class="text-sm text-muted-foreground">
          Sharing: <span class="font-mono">{{ filePath }}</span>
        </div>
        
        <!-- Share link -->
        <div v-if="shareUrl" class="flex items-center gap-2">
          <Input 
            :value="shareUrl" 
            readonly 
            class="flex-1 font-mono text-sm"
          />
          <Button @click="copyLink" size="sm" variant="outline">
            <component :is="copied ? Check : Copy" class="h-4 w-4" />
          </Button>
        </div>
        
        <!-- Generate button -->
        <div v-else class="space-y-3">
          <div class="flex gap-3">
            <Button @click="createSession" :disabled="loading" class="flex-1">
              <Share2 class="h-4 w-4 mr-2" />
              {{ loading ? 'Creating...' : 'Create Share Link' }}
            </Button>
          </div>
        </div>
        
        <!-- Permission info -->
        <div v-if="shareUrl" class="text-xs text-muted-foreground">
          Anyone with this link can edit this file with you in real-time.
        </div>
      </div>
      
      <DialogFooter>
        <Button variant="ghost" @click="isOpen = false">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Share2, Copy, Check } from 'lucide-vue-next'

const props = defineProps<{
  filePath: string
}>()

const isOpen = ref(false)
const loading = ref(false)
const sessionId = ref<string | null>(null)
const shareUrl = ref<string | null>(null)
const copied = ref(false)

async function createSession() {
  loading.value = true
  try {
    // Create session
    const sessionRes = await fetch('/api/sessions', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: [props.filePath] })
    })
    
    if (!sessionRes.ok) throw new Error('Failed to create session')
    const { session } = await sessionRes.json()
    sessionId.value = session.id
    
    // Create share link
    const shareRes = await fetch(`/api/sessions/${session.id}/share`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permission: 'edit' })
    })
    
    if (!shareRes.ok) throw new Error('Failed to create share link')
    const data = await shareRes.json()
    shareUrl.value = data.shareUrl
    
  } catch (error) {
    console.error('[ShareDialog] Error:', error)
  } finally {
    loading.value = false
  }
}

async function copyLink() {
  if (!shareUrl.value) return
  await navigator.clipboard.writeText(shareUrl.value)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}

function open() {
  isOpen.value = true
  shareUrl.value = null // Reset on open
  sessionId.value = null
}

defineExpose({ open })
</script>
