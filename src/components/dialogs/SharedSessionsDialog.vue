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
        <div v-if="loading" class="flex justify-center py-8">
          <LoadingSpinner size="md" message="Loading sessions..." />
        </div>
        
        <!-- Empty state -->
        <EmptyState
          v-else-if="sessions.length === 0"
          :icon="Share2"
          title="No shared sessions yet"
          :description="mode === 'shared-with-me' 
            ? 'When someone shares files with you, they\'ll appear here' 
            : 'Start collaborating by sharing files from the editor'"
        />
        
        <!-- Session list -->
        <div v-else class="space-y-2">
          <div
            v-for="session in sessions"
            :key="session.id"
            class="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            <div class="flex items-start gap-3">
              <div class="mt-0.5">
                <FolderGit2 v-if="isRepo(session.paths[0])" class="h-5 w-5 text-muted-foreground" />
                <FolderOpen v-else-if="isFolder(session.paths[0])" class="h-5 w-5 text-muted-foreground" />
                <FileText v-else class="h-5 w-5 text-muted-foreground" />
              </div>
              <div class="flex-1 min-w-0">
                <button 
                  @click="openSession(session)"
                  class="text-left hover:underline"
                >
                  <p class="font-medium truncate">{{ session.name || formatPath(session.paths[0]) }}</p>
                </button>
                <p class="text-xs text-muted-foreground">
                  <template v-if="mode === 'shared-with-me'">
                    from {{ session.owner }} · {{ session.memberCount }} member{{ session.memberCount !== 1 ? 's' : '' }}
                  </template>
                  <template v-else>
                    {{ session.members?.length || 1 }} member{{ (session.members?.length || 1) !== 1 ? 's' : '' }}
                    · created {{ formatDate(session.created) }}
                  </template>
                </p>
              </div>
              
              <!-- Actions for owned sessions -->
              <div v-if="mode === 'shared-by-me'" class="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon"
                  @click.stop="viewShareLinks(session)"
                  title="View share links"
                >
                  <Link class="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  @click.stop="confirmDelete(session)"
                  title="Delete session"
                  class="text-destructive hover:text-destructive"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <!-- Share links (expanded) -->
            <div v-if="expandedSession === session.id && shareLinks.length > 0" class="mt-3 pt-3 border-t border-border">
              <p class="text-xs text-muted-foreground mb-2">Share links:</p>
              <div class="space-y-1">
                <div 
                  v-for="link in shareLinks" 
                  :key="link.token"
                  class="flex items-center gap-2 text-sm"
                >
                  <code class="flex-1 text-xs bg-muted px-2 py-1 rounded truncate">
                    /s/{{ link.token }}
                  </code>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    @click="copyLink(link.token)"
                    class="h-6 w-6"
                  >
                    <component :is="copiedToken === link.token ? Check : Copy" class="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    @click="revokeLink(session.id, link.token)"
                    class="h-6 w-6 text-destructive hover:text-destructive"
                    title="Revoke"
                  >
                    <X class="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Delete confirmation -->
      <div v-if="sessionToDelete" class="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
        <p class="text-sm mb-2">Delete "{{ sessionToDelete.name || formatPath(sessionToDelete.paths[0]) }}"?</p>
        <div class="flex gap-2">
          <Button size="sm" variant="destructive" @click="deleteSession">Delete</Button>
          <Button size="sm" variant="ghost" @click="sessionToDelete = null">Cancel</Button>
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
import { Share2, FileText, FolderOpen, FolderGit2, Link, Trash2, Copy, Check, X } from 'lucide-vue-next'
import { LoadingSpinner } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'

interface SharedSession {
  id: string
  name?: string
  paths: string[]
  owner: string
  members?: string[]
  memberCount: number
  created: number
}

interface ShareLink {
  token: string
  permission: 'edit' | 'view'
  created: number
}

const isOpen = ref(false)
const loading = ref(false)
const mode = ref<'shared-with-me' | 'shared-by-me'>('shared-with-me')
const sessions = ref<SharedSession[]>([])
const expandedSession = ref<string | null>(null)
const shareLinks = ref<ShareLink[]>([])
const copiedToken = ref<string | null>(null)
const sessionToDelete = ref<SharedSession | null>(null)

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
  return parts.slice(2).join('/').replace(/\/\*$/, '') // Path within repo
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString()
}

async function fetchSessions() {
  loading.value = true
  try {
    const endpoint = mode.value === 'shared-with-me' 
      ? '/api/sessions/shared' 
      : '/api/sessions'
    
    const res = await fetch(endpoint, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json() as any
      sessions.value = data.sessions || []
    }
  } catch (error) {
    console.error('[SharedSessionsDialog] Error:', error)
  } finally {
    loading.value = false
  }
}

async function viewShareLinks(session: SharedSession) {
  if (expandedSession.value === session.id) {
    expandedSession.value = null
    shareLinks.value = []
    return
  }
  
  try {
    const res = await fetch(`/api/sessions/${session.id}/share`, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json() as any
      shareLinks.value = data.tokens || []
      expandedSession.value = session.id
    }
  } catch (error) {
    console.error('[SharedSessionsDialog] Error fetching share links:', error)
  }
}

async function copyLink(token: string) {
  await navigator.clipboard.writeText(`${window.location.origin}/s/${token}`)
  copiedToken.value = token
  setTimeout(() => copiedToken.value = null, 2000)
}

async function revokeLink(sessionId: string, token: string) {
  try {
    const res = await fetch(`/api/sessions/${sessionId}/share?token=${token}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (res.ok) {
      shareLinks.value = shareLinks.value.filter(l => l.token !== token)
    }
  } catch (error) {
    console.error('[SharedSessionsDialog] Error revoking link:', error)
  }
}

function confirmDelete(session: SharedSession) {
  sessionToDelete.value = session
}

async function deleteSession() {
  if (!sessionToDelete.value) return
  
  try {
    const res = await fetch(`/api/sessions/${sessionToDelete.value.id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (res.ok) {
      sessions.value = sessions.value.filter(s => s.id !== sessionToDelete.value?.id)
      sessionToDelete.value = null
    }
  } catch (error) {
    console.error('[SharedSessionsDialog] Error deleting session:', error)
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
  expandedSession.value = null
  shareLinks.value = []
  sessionToDelete.value = null
  isOpen.value = true
  fetchSessions()
}

defineExpose({ open })
</script>
