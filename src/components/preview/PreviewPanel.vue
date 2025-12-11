<template>
  <div class="preview-panel border-l flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between p-3 border-b bg-muted/30">
      <div class="flex items-center gap-2">
        <Eye class="w-4 h-4" />
        <span class="font-medium text-sm">Preview</span>
      </div>
      <div class="flex items-center gap-2">
        <!-- Build status indicator -->
        <div 
          v-if="isBuilding"
          class="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Loader2 class="w-3 h-3 animate-spin" />
          <span>{{ stepLabel }}...</span>
        </div>
        <div 
          v-else-if="isSuccess"
          class="flex items-center gap-1.5 text-xs text-green-600"
        >
          <CheckCircle class="w-3 h-3" />
          <span>Built</span>
        </div>
        <div 
          v-else-if="isFailure"
          class="flex items-center gap-1.5 text-xs text-destructive"
        >
          <XCircle class="w-3 h-3" />
          <span>Failed</span>
        </div>

        <!-- Render button -->
        <Button 
          size="sm" 
          variant="outline"
          :disabled="isBuilding || !repo"
          @click="triggerRender"
        >
          <Play class="w-3 h-3 mr-1" />
          Render
        </Button>

        <!-- Open in new tab -->
        <Button 
          size="icon" 
          variant="ghost"
          :disabled="!previewUrl"
          @click="openPreview"
        >
          <ExternalLink class="w-4 h-4" />
        </Button>
      </div>
    </div>

    <!-- Preview iframe -->
    <div class="flex-1 bg-white overflow-hidden">
      <iframe
        v-if="previewUrl"
        :src="previewUrl"
        class="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
      />
      <div 
        v-else 
        class="h-full flex items-center justify-center text-muted-foreground"
      >
        <div class="text-center space-y-2">
          <FileOutput class="w-12 h-12 mx-auto opacity-50" />
          <p class="text-sm">No preview available</p>
          <p class="text-xs">Render your document to see a preview</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import { 
  Eye, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Play, 
  ExternalLink,
  FileOutput 
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useBuildStatus } from '@/composables/useBuildStatus'

const props = defineProps<{
  repo?: string
}>()

const emit = defineEmits<{
  render: []
}>()

// Build status polling
const { 
  status, 
  isBuilding, 
  isSuccess, 
  isFailure, 
  stepLabel,
  startPolling,
  stopPolling,
} = useBuildStatus(props.repo || '')

// Preview URL from build status
const previewUrl = computed(() => {
  if (status.value?.status === 'success' && status.value?.url) {
    return status.value.url
  }
  return null
})

// Start polling when repo is available
watch(() => props.repo, (newRepo) => {
  if (newRepo) {
    startPolling()
  } else {
    stopPolling()
  }
}, { immediate: true })

onMounted(() => {
  if (props.repo) {
    startPolling()
  }
})

function triggerRender() {
  emit('render')
  // Polling will pick up the new status
}

function openPreview() {
  if (previewUrl.value) {
    window.open(previewUrl.value, '_blank')
  }
}
</script>

<style scoped>
.preview-panel {
  min-width: 400px;
}
</style>
