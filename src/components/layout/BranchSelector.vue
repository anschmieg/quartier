<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="outline" size="sm" class="w-full justify-between h-7 text-xs border-dashed">
        <div class="flex items-center truncate">
          <GitBranch class="w-3.5 h-3.5 mr-2 opacity-70" />
          <span class="truncate">{{ selectedBranch || 'main' }}</span>
        </div>
        <ChevronDown class="w-3 h-3 opacity-50 ml-2 flex-shrink-0" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-56">
      <DropdownMenuLabel class="text-xs">Switch Branch</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        v-for="branch in branches" 
        :key="branch.name"
        class="flex items-center justify-between"
        @click="handleChange(branch.name)"
      >
        <span>{{ branch.name }}</span>
        <div class="flex items-center gap-1">
          <span v-if="branch.isDefault" class="text-muted-foreground text-xs">default</span>
          <span v-if="branch.protected" class="text-xs">🔒</span>
          <span v-if="branch.name === selectedBranch" class="text-primary">✓</span>
        </div>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { GitBranch, ChevronDown } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { githubService } from '@/services/github'
import { useStorage } from '@vueuse/core'

const props = defineProps<{
  owner?: string
  repo?: string
}>()

const emit = defineEmits<{
  change: [branch: string]
}>()

interface Branch {
  name: string
  sha: string
  protected: boolean
  isDefault: boolean
}

const branches = ref<Branch[]>([])
const selectedBranch = ref<string>('')

// Persist selected branch per repo
const storedBranches = useStorage<Record<string, string>>('quartier:selectedBranch', {})

async function loadBranches() {
  if (!props.owner || !props.repo) {
    branches.value = []
    return
  }
  
  try {
    const data = await githubService.listBranches(props.owner, props.repo)
    branches.value = data.branches
    
    // Restore persisted branch or use default
    const repoKey = `${props.owner}/${props.repo}`
    const stored = storedBranches.value[repoKey]
    
    if (stored && data.branches.some(b => b.name === stored)) {
      selectedBranch.value = stored
    } else {
      selectedBranch.value = data.defaultBranch
    }
  } catch (e) {
    console.error('[BranchSelector] Failed to load branches:', e)
    branches.value = []
    selectedBranch.value = 'main'
  }
}

function handleChange(value: string) {
  selectedBranch.value = value
  
  // Persist selection
  if (props.owner && props.repo) {
    const repoKey = `${props.owner}/${props.repo}`
    storedBranches.value = {
      ...storedBranches.value,
      [repoKey]: value
    }
  }
  
  emit('change', value)
}

// Load branches when repo changes
watch(() => [props.owner, props.repo], loadBranches, { immediate: true })

onMounted(() => {
  loadBranches()
})
</script>
