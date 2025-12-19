<template>
  <div class="min-h-screen bg-background text-foreground flex flex-col">
    <!-- Simple Header -->
    <header class="h-14 border-b px-6 flex items-center justify-between">
      <div class="font-bold text-lg tracking-tight">Quartier</div>
      <div class="flex items-center gap-2">
        <!-- Settings or Profile could go here -->
      </div>
    </header>

    <main class="flex-1 w-full max-w-5xl mx-auto p-6 space-y-10">
      
      <!-- Welcome Section -->
      <div class="text-center py-8 space-y-2">
        <h1 class="text-3xl font-bold tracking-tight">Welcome Back</h1>
        <p class="text-muted-foreground">Continue where you left off or start something new.</p>
      </div>

      <!-- Recent Projects -->
      <section v-if="recentProjects.length > 0" class="space-y-4">
        <h2 class="text-lg font-semibold flex items-center gap-2">
          <Clock class="w-4 h-4" />
          Jump Back In
        </h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card 
            v-for="project in recentProjects" 
            :key="project.id"
            class="group cursor-pointer hover:border-primary/50 transition-colors"
            @click="openProject(project)"
          >
           <CardHeader class="pb-3">
             <CardTitle class="text-base flex items-center gap-2">
                <component :is="getProviderIcon(project.providerId)" class="w-4 h-4 shrink-0 opacity-70" />
                <span class="truncate">{{ project.name }}</span>
             </CardTitle>
             <CardDescription class="text-xs">
               {{ getProviderName(project.providerId) }} • {{ formatDate(project.lastAccessed) }}
             </CardDescription>
           </CardHeader>
          </Card>
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="space-y-4">
        <h2 class="text-lg font-semibold flex items-center gap-2">
          <PlusCircle class="w-4 h-4" />
          Create or Open
        </h2>
        
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="outline" class="h-auto py-4 flex flex-col gap-2 items-center justify-center border-dashed" @click="handleOpenLocal">
            <Monitor class="w-6 h-6 opacity-50" />
            <span>Local Folder</span>
          </Button>
          
          <Button variant="outline" class="h-auto py-4 flex flex-col gap-2 items-center justify-center border-dashed" @click="handleOpenGitHub">
            <Github class="w-6 h-6 opacity-50" />
            <span>GitHub Repo</span>
          </Button>

          <Button variant="outline" class="h-auto py-4 flex flex-col gap-2 items-center justify-center border-dashed" @click="handleOpenCloud('gdrive')">
            <Cloud class="w-6 h-6 text-blue-500 opacity-80" />
            <span>Google Drive</span>
          </Button>

           <Button variant="outline" class="h-auto py-4 flex flex-col gap-2 items-center justify-center border-dashed" @click="handleOpenCloud('nextcloud')">
            <Cloud class="w-6 h-6 text-sky-600 opacity-80" />
            <span>Nextcloud</span>
          </Button>
        </div>
      </section>

    </main>

    <!-- Project Selectors (Reused from AppLayout / Modals) -->
    <!-- We need to invoke them programmatically or mount them here. 
         Ideally these modals should be global or we need to import them.
         For simplicity, we might redirect to /app and trigger the modal there via query param?
         Or just mount them here. Mounting here is cleaner UX. -->
         
    <LocalProjectSelector 
        v-model:open="showLocalSelector" 
        @select="handleLocalSelect" 
    />
    <RepoSelector 
        v-model:open="showRepoSelector"
        @select="handleRepoSelect"
    />
    <CloudProjectSelector
        v-model:open="showCloudSelector"
        :provider="targetCloudProvider"
        @select="handleCloudSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { historyService, type RecentProject } from '@/services/history'
import { storageManager } from '@/services/storageManager'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, PlusCircle, Monitor, Github, Cloud } from 'lucide-vue-next'
import { useTimeAgo } from '@vueuse/core'

// Modals
import LocalProjectSelector from '@/components/layout/LocalProjectSelector.vue'
import RepoSelector from '@/components/github/RepoSelector.vue'
import CloudProjectSelector from '@/components/layout/CloudProjectSelector.vue'

const router = useRouter()
const recentProjects = computed(() => historyService.getProjects())

// Modal State
const showLocalSelector = ref(false)
const showRepoSelector = ref(false)
const showCloudSelector = ref(false)
const targetCloudProvider = ref<any>(null)

function getProviderIcon(id: string) {
  switch(id) {
    case 'github': return Github
    case 'local': return Monitor
    case 'gdrive': return Cloud
    case 'nextcloud': return Cloud
    default: return Cloud
  }
}

function getProviderName(id: string) {
   switch(id) {
    case 'github': return 'GitHub'
    case 'local': return 'Local'
    case 'gdrive': return 'Google Drive'
    case 'nextcloud': return 'Nextcloud'
    default: return id
  }
}

function formatDate(ts: number) {
  return useTimeAgo(ts).value
}

// Navigation
function openProject(project: RecentProject) {
  storageManager.setSource(project.providerId, project.projectId)
  router.push('/app')
}

// Actions
function handleOpenLocal() {
  showLocalSelector.value = true
}

function handleOpenGitHub() {
  showRepoSelector.value = true
}

function handleOpenCloud(providerId: string) {
  const provider = storageManager.allProviders.find(p => p.id === providerId)
  if (provider) {
    targetCloudProvider.value = provider
    showCloudSelector.value = true
  }
}

// Selection Handlers (Same logic as AppLayout effectively)
async function handleLocalSelect(projectId: string) {
    storageManager.setSource('local', projectId)
    router.push('/app')
}

function handleRepoSelect(repo: { full_name: string }) {
    storageManager.setSource('github', repo.full_name)
    router.push('/app')
}

function handleCloudSelect(projectId: string) {
    if (targetCloudProvider.value) {
        storageManager.setSource(targetCloudProvider.value.id, projectId)
        router.push('/app')
    }
}
</script>
