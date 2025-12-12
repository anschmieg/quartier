<template>
  <div class="h-full flex flex-col">
    <!-- Save Status (subtle indicator in corner) -->
    <div class="absolute top-2 right-3 z-10">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-300"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <span v-if="saving" class="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 class="w-3 h-3 animate-spin" />
          Saving...
        </span>
        <span v-else-if="saved" class="text-xs text-muted-foreground/70 flex items-center gap-1">
          <Check class="w-3 h-3" />
          Saved
        </span>
      </Transition>
    </div>

    <!-- Editors -->
    <div class="flex-1 overflow-hidden relative">
      <Transition
        enter-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
        mode="out-in"
      >
        <div v-if="mode === 'visual'" key="visual" class="h-full overflow-auto">
          <MilkdownEditor 
            ref="milkdownRef"
            v-model="content" 
            :editable="!saving"
          />
        </div>
        <div v-else key="source" class="h-full overflow-auto">
          <CodeEditor 
            v-model="content"
          />
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, defineAsyncComponent } from 'vue'
import { Loader2, Check } from 'lucide-vue-next'
import CodeEditor from './CodeEditor.vue'

// Lazy load Milkdown editor (large bundle ~900KB)
const MilkdownEditor = defineAsyncComponent({
  loader: () => import('./MilkdownEditor.vue'),
  loadingComponent: { template: '<div class="flex items-center justify-center h-full"><div class="text-muted-foreground">Loading visual editor...</div></div>' },
  delay: 200
})

const props = defineProps<{
  initialContent: string
  mode: 'visual' | 'source'
}>()

const emit = defineEmits(['update:content', 'save'])

const content = ref(props.initialContent)
const saving = ref(false)
const saved = ref(false)

// Sync content when props change (e.g. file load)
watch(() => props.initialContent, (newVal) => {
  content.value = newVal
  saved.value = false
})

// Auto-save with debounce and status indicator
let saveTimeout: ReturnType<typeof setTimeout> | null = null

watch(content, (newVal) => {
  emit('update:content', newVal)
  saved.value = false
  
  // Debounced save indicator
  if (saveTimeout) clearTimeout(saveTimeout)
  saving.value = true
  
  saveTimeout = setTimeout(() => {
    saving.value = false
    saved.value = true
  }, 500)
})
</script>
