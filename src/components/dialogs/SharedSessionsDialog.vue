<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-lg max-h-[80vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>{{ mode === 'shared-with-me' ? 'Shared with me' : 'Shared by me' }}</DialogTitle>
        <DialogDescription>
          {{ mode === 'shared-with-me' 
            ? 'Files and folders others have shared with you.' 
            : 'Sessions you\'ve shared with others.' }}
        </DialogDescription>
      </DialogHeader>
      
      <div class="flex-1 overflow-auto py-2">
        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-8">
          <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
        
        <!-- Empty state -->
        <div v-else-if="sessions.length === 0" class="text-center py-8 text-muted-foreground">
          <Share2 class="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No shared sessions yet</p>
        </div>
        
        <!-- Session list -->
        <div v-else class="space-y-2">
          <button
            v-for="session in sessions"
            :key="session.id"
            @click="openSession(session)"
            class="w-full p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
          >
            <div class="flex items-start gap-3">
              <div class="mt-0.5">
                <FolderGit2 v-if="isRepo(session.paths[0])" class="h-5 w-5 text-muted-foreground" />
                <FolderOpen v-else-if="isFolder(session.paths[0])" class="h-5 w-5 text-muted-foreground" />
                <FileText v-else class="h-5 w-5 text-muted-foreground" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">{{ session.name || formatPath(session.paths[0]) }}</p>
                <p class="text-xs text-muted-foreground">
                  from {{ session.owner }} · {{ session.memberCount }} member{{ session.memberCount !== 1 ? 's' : '' }}
                </p>
              </div>
            </div>
          </button>
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
import { Loader2, Share2, FileText, FolderOpen, FolderGit2 } from 'lucide-vue-next'

interface SharedSession {
  id: string
  name?: string
  paths: string[]
  owner: string
  memberCount: number
  created: number
}

const isOpen = ref(false)
const loading = ref(false)
const mode = ref<'shared-with-me' | 'shared-by-me'>('shared-with-me')
const sessions = ref<SharedSession[]>([])

function isRepo(path: string | undefined): boolean {
  if (!path) return false
  return path.split('/').length === 2
}

function isFolder(path: string | undefined): boolean {
  if (!path) return false
  return !path.includes('.') || path.endsWith('/*')
}

function formatPath(path: string | undefined): string {
  if (!path) return ''
  const parts = path.split('/')
  if (parts.length === 2) return parts[1] ?? '' // Repo name
  return parts.slice(2).join('/') // Path within repo
}

async function fetchSessions() {
  loading.value = true
  try {
    const endpoint = mode.value === 'shared-with-me' 
      ? '/api/sessions/shared' 
      : '/api/sessions'
    
    const res = await fetch(endpoint, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      sessions.value = data.sessions || []
    }
  } catch (error) {
    console.error('[SharedSessionsDialog] Error:', error)
  } finally {
    loading.value = false
  }
}

function openSession(session: SharedSession) {
  if (!session.paths || session.paths.length === 0) return
  
  // Set repo and file in localStorage
  const firstPath = session.paths[0]?.replace(/\/\*$/, '') ?? ''
  const parts = firstPath.split('/')
  
  if (parts.length >= 2) {
    localStorage.setItem('quartier:repo', `${parts[0]}/${parts[1]}`)
    
    // If it's a specific file, open it
    if (parts.length > 2 && (parts[parts.length - 1] ?? '').includes('.')) {
      localStorage.setItem('quartier:currentFile', JSON.stringify(parts.slice(2).join('/')))
    }
  }
  
  // Store active session
  localStorage.setItem('quartier:activeSession', JSON.stringify(session))
  
  isOpen.value = false
  
  // Reload to apply changes
  window.location.reload()
}

function open(newMode: 'shared-with-me' | 'shared-by-me' = 'shared-with-me') {
  mode.value = newMode
  isOpen.value = true
  fetchSessions()
}

defineExpose({ open })
</script>
