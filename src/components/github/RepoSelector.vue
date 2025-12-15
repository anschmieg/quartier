<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[425px] p-0 overflow-hidden gap-0">
      <DialogHeader class="px-4 py-3 border-b">
        <DialogTitle>Select Repository</DialogTitle>
        <DialogDescription class="hidden">Choose a GitHub repository to work on</DialogDescription>
      </DialogHeader>
      
      <div class="p-4">
        <Input 
          v-model="searchQuery" 
          placeholder="Search repositories..." 
          class="mb-4"
          autofocus
        />

        <div v-if="loading" class="flex justify-center py-8">
          <LoadingSpinner size="md" message="Loading repositories..." />
        </div>

        <ErrorMessage
          v-else-if="error"
          variant="error"
          :message="error"
          actionText="Retry"
          @action="loadRepos"
        />

        <div v-else class="h-[300px] overflow-y-auto -mx-2 px-2 space-y-1">
          <button
            v-for="repo in filteredRepos"
            :key="repo.id"
            class="w-full flex items-center px-2 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground text-left transition-colors"
            @click="selectRepo(repo)"
          >
            <BookMarked class="w-4 h-4 mr-2 text-muted-foreground" />
            <div class="flex-1 min-w-0">
              <div class="font-medium truncate">{{ repo.full_name }}</div>
              <div class="text-xs text-muted-foreground truncate" v-if="repo.description">
                {{ repo.description }}
              </div>
            </div>
            <Check v-if="repo.full_name === currentRepo" class="w-4 h-4 ml-2 text-primary" />
          </button>
          
          <EmptyState
            v-if="filteredRepos.length === 0"
            :icon="BookMarked"
            :title="searchQuery ? 'No matching repositories' : 'No repositories found'"
            :description="searchQuery ? 'Try a different search term' : 'Create a repository on GitHub to get started'"
            class="py-8"
          />
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { BookMarked, Check } from 'lucide-vue-next'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorMessage } from '@/components/ui/error'
import { EmptyState } from '@/components/ui/empty-state'
import { githubService } from '@/services/github'

const props = defineProps<{
  open: boolean
  currentRepo?: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'select', repo: { owner: string, name: string, full_name: string }): void
}>()

interface Repository {
  id: number
  name: string
  full_name: string
  description: string | null
  owner: {
    login: string
  }
}

const repos = ref<Repository[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const loaded = ref(false)

const filteredRepos = computed(() => {
  if (!searchQuery.value) return repos.value
  const lower = searchQuery.value.toLowerCase()
  return repos.value.filter(r => r.full_name.toLowerCase().includes(lower))
})

async function loadRepos() {
  loading.value = true
  error.value = null
  try {
    repos.value = await githubService.listRepos()
    loaded.value = true
  } catch (e) {
    console.error(e)
    error.value = 'Failed to load repositories'
  } finally {
    loading.value = false
  }
}

function selectRepo(repo: Repository) {
  emit('select', {
    owner: repo.owner.login,
    name: repo.name,
    full_name: repo.full_name
  })
  emit('update:open', false)
}

// Load when opened
watch(() => props.open, (isOpen) => {
  if (isOpen && !loaded.value) {
    loadRepos()
  }
})
</script>
