<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Open from {{ providerName }}</DialogTitle>
        <DialogDescription>
          Navigate to the folder you want to open and click "Select this folder".
        </DialogDescription>
      </DialogHeader>

      <div class="py-2 space-y-4">
        <!-- Auth State -->
        <div v-if="loading && !projects.length" class="flex items-center justify-center p-8">
            <Loader2 class="w-8 h-8 animate-spin text-muted-foreground" />
        </div>

        <div v-else-if="!isAuthenticated" class="flex flex-col items-center justify-center p-8 gap-4 text-center">
            <Cloud class="w-12 h-12 text-muted-foreground opacity-50" />
            <p class="text-sm text-muted-foreground">
                Connect to {{ providerName }} to access your files.
            </p>

            <!-- Custom Login Form for Nextcloud -->
            <div v-if="provider?.id === 'nextcloud'" class="w-full space-y-3 text-left">
                <div class="space-y-1">
                    <label class="text-xs font-medium">Server URL</label>
                    <input v-model="nextcloudConfig.url" class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs" placeholder="https://cloud.example.com/remote.php/dav/files/user/" />
                    <p class="text-[10px] text-muted-foreground">The full WebDAV URL to your files.</p>
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-medium">Username</label>
                    <input v-model="nextcloudConfig.username" class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs" />
                </div>
                 <div class="space-y-1">
                    <label class="text-xs font-medium">Password / App Token</label>
                    <input v-model="nextcloudConfig.password" type="password" class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs" />
                    <p class="text-[10px] text-muted-foreground text-amber-600/80">
                        Recommendation: Use a dedicated App Password/Token from your Nextcloud security settings.
                    </p>
                </div>
                 <Button @click="handleLogin" class="w-full mt-2" :disabled="!nextcloudConfig.url || !nextcloudConfig.username || !nextcloudConfig.password">
                    Connect
                </Button>
            </div>

            <!-- Generic Login Button (e.g. Google Drive) -->
            <Button v-else @click="handleLogin">
                Connect {{ providerName }}
            </Button>
            
            <p v-if="error" class="text-xs text-destructive mt-2">{{ error }}</p>
        </div>

        <!-- Project List with Navigation -->
        <div v-else class="space-y-4">
            <!-- Navigation Header -->
            <div class="flex items-center gap-2 text-sm border-b pb-2">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    class="h-6 w-6" 
                    :disabled="history.length === 0"
                    @click="goUp"
                >
                    <ArrowLeft class="w-4 h-4" />
                </Button>
                <div class="font-medium truncate flex-1">
                    {{ currentFolderName || 'Root' }}
                </div>
                <Button size="sm" @click="selectCurrentFolder" :disabled="!currentFolderId && history.length === 0">
                    Select this folder
                </Button>
            </div>

            <div v-if="projects.length === 0" class="text-center py-8 text-muted-foreground">
                No subfolders found.
            </div>
            
            <div v-else class="flex flex-col gap-1 max-h-[300px] min-h-[200px] overflow-y-auto">
                <Button
                    v-for="proj in projects"
                    :key="proj.id"
                    variant="ghost"
                    class="justify-start font-normal h-9"
                    @click="enterFolder(proj)"
                >
                    <Folder class="w-4 h-4 mr-2 text-blue-500 fill-blue-500/20" />
                    <span class="truncate">{{ proj.name }}</span>
                    <ChevronRight class="w-3 h-3 ml-auto opacity-50" />
                </Button>
            </div>
            
            <div class="flex justify-between items-center pt-2 border-t">
                <span class="text-xs text-muted-foreground">
                    {{ projects.length }} folders
                </span>
                <Button variant="ghost" size="sm" class="h-6 text-xs text-muted-foreground hover:text-destructive" @click="handleLogout">
                    Disconnect
                </Button>
            </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Cloud, Folder, ArrowLeft, ChevronRight } from 'lucide-vue-next'
import type { StorageProvider } from '@/types/providers'

const props = defineProps<{
  open: boolean
  provider: StorageProvider | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'select': [id: string]
}>()

const loading = ref(false)
const isAuthenticated = ref(false)
const projects = ref<any[]>([])
const error = ref<string | null>(null)
const providerName = ref('Cloud Storage')

// Navigation state
const currentFolderId = ref<string | null>(null)
const currentFolderName = ref<string>('Root')
const history = ref<{id: string | null, name: string}[]>([])

watch(() => props.open, async (isOpen) => {
    if (isOpen && props.provider) {
        providerName.value = props.provider.name
        // Reset nav
        currentFolderId.value = null
        currentFolderName.value = 'Root'
        history.value = []
        
        await checkAuth()
    }
})

async function checkAuth() {
    if (!props.provider) return
    loading.value = true
    error.value = null
    
    try {
        isAuthenticated.value = await props.provider.isAuthenticated?.() ?? false
        if (isAuthenticated.value) {
            await loadProjects()
        }
    } catch (e) {
        console.error('Auth check failed:', e)
        error.value = 'Failed to check authentication'
    } finally {
        loading.value = false
    }
}

const nextcloudConfig = ref({
    url: '',
    username: '',
    password: ''
})

async function handleLogin() {
    if (!props.provider) return
    loading.value = true
    error.value = null
    
    try {
        if (props.provider.id === 'nextcloud') {
            await props.provider.login?.(nextcloudConfig.value)
        } else {
            await props.provider.login?.()
        }
        isAuthenticated.value = true
        await loadProjects()
    } catch (e) {
        console.error('Login failed:', e)
        error.value = e instanceof Error ? e.message : 'Login failed'
    } finally {
        loading.value = false
    }
}

async function handleLogout() {
    if (!props.provider) return
    try {
        await props.provider.logout?.()
        isAuthenticated.value = false
        projects.value = []
        currentFolderId.value = null
        history.value = []
    } catch (e) {
        console.error('Logout failed:', e)
    }
}

async function loadProjects() {
    if (!props.provider?.listProjects) return
    loading.value = true
    try {
        // Pass currentFolderId (undefined = root)
        // Need to cast to any because generic interface might not contain this param strictly defined yet
        // but we know GoogleDriveProvider supports it.
        projects.value = await (props.provider.listProjects as any)(currentFolderId.value)
    } catch (e) {
        console.error('Failed to list projects:', e)
        error.value = 'Failed to list folders'
    } finally {
        loading.value = false
    }
}

function enterFolder(folder: {id: string, name: string}) {
    history.value.push({
        id: currentFolderId.value,
        name: currentFolderName.value
    })
    currentFolderId.value = folder.id
    currentFolderName.value = folder.name
    loadProjects()
}

function goUp() {
    const prev = history.value.pop()
    if (prev) {
        currentFolderId.value = prev.id
        currentFolderName.value = prev.name
        loadProjects()
    } else {
        // Already at root, just reset to be safe
        currentFolderId.value = null
        currentFolderName.value = 'Root'
        loadProjects()
    }
}

function selectCurrentFolder() {
    if (currentFolderId.value) {
        emit('select', currentFolderId.value)
    } else {
        // Cannot select root directly usually, unless we support 'root' string
        // Let's assume user wants to select root if they are there
        // But listing root usually returns a list of folders, not a folder ID itself.
        // Google Drive 'root' IS a folder ID alias.
        emit('select', 'root') 
    }
}
</script>
