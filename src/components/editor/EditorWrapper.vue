<template>
  <div class="h-full flex flex-col">
    <!-- Save Status (hidden for now - was distracting)
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
    -->

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
            :key="roomId"
            v-model="content"
            :editable="true"
            :roomId="roomId"
            :userEmail="userEmail"
            :enableCollab="enableCollab"
            :showComments="showComments"
          />
        </div>
        <div v-else key="source" class="h-full overflow-auto">
          <CodeEditor 
            v-model="content"
            :filename="filename"
          />
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import CodeEditor from './CodeEditor.vue'
import MilkdownEditor from './MilkdownEditor.vue'

// Reference to the Milkdown component to access exposed methods
const milkdownRef = ref<any>(null)

// Helper to get the underlying editor instance
const getMilkdownEditor = () => {
  return milkdownRef.value?.getEditor?.()
}

// Expose so parent (AppLayout) can grab it
defineExpose({
  getMilkdownEditor
})

const props = defineProps<{
  initialContent: string
  mode: 'visual' | 'source'
  roomId?: string
  userEmail?: string
  enableCollab?: boolean
  filename?: string
  showComments?: boolean
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

// Debounced content update and save indicator
let debounceTimeout: ReturnType<typeof setTimeout> | null = null

watch(content, (newVal) => {
  // Clear any pending debounce
  if (debounceTimeout) clearTimeout(debounceTimeout)
  
  // Show saving indicator immediately for feedback
  saving.value = true
  saved.value = false
  
  // Debounce the actual emit and save completion
  debounceTimeout = setTimeout(() => {
    emit('update:content', newVal)
    saving.value = false
    saved.value = true
  }, 300) // 300ms debounce
})
</script>
