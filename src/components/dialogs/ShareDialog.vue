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
              type="button"
              @click="setScope('file')"
              class="p-3 rounded-lg border text-left transition-all"
              :class="shareScope === 'file' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'"
            >
              <FileText class="h-5 w-5 mb-1" :class="shareScope === 'file' ? 'text-primary' : 'text-muted-foreground'" />
              <p class="text-sm font-medium">This file</p>
              <p class="text-xs text-muted-foreground truncate">{{ fileName }}</p>
            </button>
            <button 
              type="button"
              @click="setScope('folder')"
              class="p-3 rounded-lg border text-left transition-all"
              :class="shareScope === 'folder' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'"
            >
              <FolderOpen class="h-5 w-5 mb-1" :class="shareScope === 'folder' ? 'text-primary' : 'text-muted-foreground'" />
              <p class="text-sm font-medium">This folder</p>
              <p class="text-xs text-muted-foreground truncate">{{ folderName }}/</p>
            </button>
            <button 
              type="button"
              @click="setScope('repo')"
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
              :model-value="shareUrl ?? ''" 
              :default-value="shareUrl ?? ''"
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
            {{ loading ? 'Creating & Syncing...' : 'Create Share Link' }}
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
import { useRoute } from 'vue-router'
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
import { githubService } from '@/services/github'
import { kvSync } from '@/services/storage'

const props = defineProps<{
  filePath: string // Full path: owner/repo/path/to/file.md
}>()

const isOpen = ref(false)
const loading = ref(false)
const sessionId = ref<string | null>(null)
const shareUrl = ref<string | null>(null)
const copied = ref(false)
const shareScope = ref<'file' | 'folder' | 'repo'>('file')

const route = useRoute()

// Computed path components
const pathParts = computed(() => props.filePath.split('/'))
const repoName = computed(() => pathParts.value.slice(0, 2).join('/'))
const fileName = computed(() => pathParts.value[pathParts.value.length - 1] || 'file')

// Get folder path from URL query param or from file path
const urlPath = computed(() => (route.query.path as string) || '')
const folderName = computed(() => {
  // First check URL path param (for when browsing a folder)
  if (urlPath.value) {
    return urlPath.value
  }
  // Fallback to parent folder of current file
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
      // Use URL path if available, otherwise derive from file path
      if (urlPath.value) {
        return `${repoName.value}/${urlPath.value}/*`
      }
      if (pathParts.value.length > 3) {
        return pathParts.value.slice(0, -1).join('/') + '/*'
      }
      return repoName.value + '/*' // If file at root, folder = repo
    case 'repo': return repoName.value + '/*'
  }
})

function setScope(scope: 'file' | 'folder' | 'repo') {
  shareScope.value = scope
}

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

    // Perform initial sync of shared content to KV
    // This ensures guests see files immediately without "lazy sync"
    const [owner, repo] = pathParts.value.slice(0, 2)
    if (owner && repo) {
        try {
            loading.value = true // Keep loading true
            
            // Determine path to sync
            let filesToSync: string[] = []
            
            if (shareScope.value === 'file') {
                // Sync specific file
                const path = pathParts.value.slice(2).join('/')
                filesToSync = [path]
            } else {
                // Folder or Repo: List files
                // Derive folder path
                let folderPath = ''
                if (shareScope.value === 'folder') {
                    if (urlPath.value) folderPath = urlPath.value
                    else if (pathParts.value.length > 3) folderPath = pathParts.value.slice(2, -1).join('/')
                    // else root (repo scope)
                }
                
                // Fetch list from GitHub
                // Note: This is shallow list. Recursive sync might be too heavy?
                // User asked for "all shared files". Assuming single-level or user will nav.
                // But Guest can't nav if folder doesn't exist in KV?
                // Guest List logic handles subfolders if files exist.
                // Let's list shallow for now.
                const contents = await githubService.loadRepo(owner, repo, folderPath)
                if (Array.isArray(contents)) {
                    filesToSync = contents
                        .filter((item: any) => item.type === 'file')
                        .map((item: any) => item.path)
                }
            }
            
            console.log(`[ShareDialog] Syncing ${filesToSync.length} files...`)
            
            // Batch sync (sequential to be safe)
            for (const path of filesToSync) {
                try {
                   // Read from GitHub (or local cache?)
                   // Better to read fresh from GitHub or Cache to ensure consistency
                   const content = await githubService.readFile(owner, repo, path)
                   await kvSync.put(owner, repo, path, content)
                } catch (err) {
                   console.error(`Failed to sync ${path}:`, err)
                }
            }
            console.log('[ShareDialog] Sync complete')
        } catch (syncErr) {
            console.error('[ShareDialog] Sync failed:', syncErr)
            // Don't block UI, link is created
        }
    }
    
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
