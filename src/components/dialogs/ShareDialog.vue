<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Share</DialogTitle>
        <DialogDescription>
          Choose what to share and create a link for collaborators.
        </DialogDescription>
      </DialogHeader>
      
      <div class="space-y-4">
        <!-- Share scope selection -->
        <div v-if="!shareUrl" class="space-y-2">
          <p class="text-sm text-muted-foreground">Share scope:</p>
          <div class="grid grid-cols-3 gap-2">
            <button 
              @click="shareScope = 'file'"
              class="p-3 rounded-lg border text-left transition-all"
              :class="shareScope === 'file' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'"
            >
              <FileText class="h-5 w-5 mb-1" :class="shareScope === 'file' ? 'text-primary' : 'text-muted-foreground'" />
              <p class="text-sm font-medium">This file</p>
              <p class="text-xs text-muted-foreground truncate">{{ fileName }}</p>
            </button>
            <button 
              @click="shareScope = 'folder'"
              class="p-3 rounded-lg border text-left transition-all"
              :class="shareScope === 'folder' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'"
            >
              <FolderOpen class="h-5 w-5 mb-1" :class="shareScope === 'folder' ? 'text-primary' : 'text-muted-foreground'" />
              <p class="text-sm font-medium">This folder</p>
              <p class="text-xs text-muted-foreground truncate">{{ folderName }}/</p>
            </button>
            <button 
              @click="shareScope = 'repo'"
              class="p-3 rounded-lg border text-left transition-all"
              :class="shareScope === 'repo' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'"
            >
              <FolderGit2 class="h-5 w-5 mb-1" :class="shareScope === 'repo' ? 'text-primary' : 'text-muted-foreground'" />
              <p class="text-sm font-medium">Entire repo</p>
              <p class="text-xs text-muted-foreground truncate">{{ repoName }}</p>
            </button>
          </div>
        </div>
        
        <!-- Share link result -->
        <div v-if="shareUrl" class="space-y-2">
          <p class="text-sm text-muted-foreground">
            Sharing: <span class="font-mono">{{ sharePath }}</span>
          </p>
          <div class="flex items-center gap-2">
            <Input 
              :value="shareUrl" 
              readonly 
              class="flex-1 font-mono text-sm"
            />
            <Button @click="copyLink" size="sm" variant="outline">
              <component :is="copied ? Check : Copy" class="h-4 w-4" />
            </Button>
          </div>
          <p class="text-xs text-muted-foreground">
            Anyone with this link can collaborate in real-time.
          </p>
        </div>
        
        <!-- Generate button -->
        <div v-if="!shareUrl">
          <Button @click="createSession" :disabled="loading" class="w-full">
            <Share2 class="h-4 w-4 mr-2" />
            {{ loading ? 'Creating...' : 'Create Share Link' }}
          </Button>
        </div>
      </div>
      
      <DialogFooter>
        <Button variant="ghost" @click="isOpen = false">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
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
import { Share2, Copy, Check, FileText, FolderOpen, FolderGit2 } from 'lucide-vue-next'

const props = defineProps<{
  filePath: string // Full path: owner/repo/path/to/file.md
}>()

const isOpen = ref(false)
const loading = ref(false)
const sessionId = ref<string | null>(null)
const shareUrl = ref<string | null>(null)
const copied = ref(false)
const shareScope = ref<'file' | 'folder' | 'repo'>('file')

// Computed path components
const pathParts = computed(() => props.filePath.split('/'))
const repoName = computed(() => pathParts.value.slice(0, 2).join('/'))
const fileName = computed(() => pathParts.value[pathParts.value.length - 1] || 'file')
const folderName = computed(() => {
  if (pathParts.value.length > 3) {
    return pathParts.value.slice(2, -1).join('/')
  }
  return pathParts.value[1] || 'root' // Just repo name if file is at root
})

// The path to share based on selected scope
const sharePath = computed(() => {
  switch (shareScope.value) {
    case 'file': return props.filePath
    case 'folder': 
      if (pathParts.value.length > 3) {
        return pathParts.value.slice(0, -1).join('/')
      }
      return repoName.value // If file at root, folder = repo
    case 'repo': return repoName.value
  }
})

async function createSession() {
  loading.value = true
  try {
    // Create session with selected scope
    const sessionRes = await fetch('/api/sessions', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: [sharePath.value] })
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
  shareScope.value = 'file' // Reset to file scope
}

defineExpose({ open })
</script>
