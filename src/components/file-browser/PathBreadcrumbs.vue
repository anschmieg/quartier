<template>
  <div 
    v-if="currentPath" 
    class="flex items-center gap-1 px-2 py-1.5 mb-2 text-xs text-muted-foreground bg-muted/50 rounded overflow-x-auto"
  >
    <button @click="emit('navigate', '')" class="hover:text-foreground flex-shrink-0">
      <Home class="w-3 h-3" />
    </button>
    <template v-for="(segment, idx) in segments" :key="idx">
      <ChevronRight class="w-3 h-3 opacity-50 flex-shrink-0" />
      <button 
        @click="emit('navigate', getPathAtIndex(idx))" 
        class="hover:text-foreground truncate max-w-[100px]"
        :title="segment"
      >
        {{ segment }}
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Home, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  currentPath: string
}>()

const emit = defineEmits<{
  navigate: [path: string]
}>()

const segments = computed(() => 
  props.currentPath ? props.currentPath.split('/').filter(Boolean) : []
)

function getPathAtIndex(idx: number): string {
  return segments.value.slice(0, idx + 1).join('/')
}
</script>
