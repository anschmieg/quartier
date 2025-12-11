<template>
  <div class="h-full flex flex-col">
    <!-- Main Toolbar (only in visual mode) -->
    <EditorToolbar v-if="mode === 'visual'" :editor="tiptapRef?.editor" />
    
    <!-- Mode Toggle Bar -->
    <div class="border-b p-2 flex items-center justify-between bg-muted/30">
      <div class="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          :class="{ 'bg-muted': mode === 'visual' }"
          @click="toggleMode('visual')"
        >
          <Eye class="w-4 h-4 mr-1" />
          Visual
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          :class="{ 'bg-muted': mode === 'source' }"
          @click="toggleMode('source')"
        >
          <Code class="w-4 h-4 mr-1" />
          Source
        </Button>
      </div>
      <div class="flex items-center gap-2">
        <span v-if="saving" class="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 class="w-3 h-3 animate-spin" />
          Saving...
        </span>
        <span v-else-if="saved" class="text-xs text-muted-foreground flex items-center gap-1">
          <Check class="w-3 h-3" />
          Saved
        </span>
      </div>
    </div>

    <!-- Editors -->
    <div class="flex-1 overflow-hidden relative">
      <div v-show="mode === 'visual'" class="h-full overflow-auto">
        <TiptapEditor 
          ref="tiptapRef"
          v-model="content" 
          :editable="!saving"
        />
      </div>
      <div v-show="mode === 'source'" class="h-full overflow-auto">
        <CodeEditor 
          v-model="content"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Eye, Code, Loader2, Check } from 'lucide-vue-next'
import TiptapEditor from './TiptapEditor.vue'
import CodeEditor from './CodeEditor.vue'
import EditorToolbar from './EditorToolbar.vue'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  initialContent: string
}>()

const emit = defineEmits(['update:content', 'save'])

const mode = ref<'visual' | 'source'>('visual')
const content = ref(props.initialContent)
const saving = ref(false)
const saved = ref(false)
const tiptapRef = ref<InstanceType<typeof TiptapEditor> | null>(null)

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

function toggleMode(newMode: 'visual' | 'source') {
  mode.value = newMode
}
</script>
