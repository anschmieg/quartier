<template>
  <div class="h-full flex flex-col">
    <!-- Toolbar -->
    <div class="border-b p-2 flex items-center justify-between bg-background">
      <div class="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          :class="{ 'bg-muted': mode === 'visual' }"
          @click="toggleMode('visual')"
        >
          Visual
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          :class="{ 'bg-muted': mode === 'source' }"
          @click="toggleMode('source')"
        >
          Source
        </Button>
      </div>
      <div class="text-xs text-muted-foreground" v-if="saving">
        Saving...
      </div>
    </div>

    <!-- Editors -->
    <div class="flex-1 overflow-hidden relative">
      <div v-show="mode === 'visual'" class="h-full overflow-auto p-4">
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
import TiptapEditor from './TiptapEditor.vue'
import CodeEditor from './CodeEditor.vue'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  initialContent: string
}>()

const emit = defineEmits(['update:content', 'save'])

const mode = ref<'visual' | 'source'>('visual')
const content = ref(props.initialContent)
const saving = ref(false)

// Sync content when props change (e.g. file load)
watch(() => props.initialContent, (newVal) => {
  content.value = newVal
})

// Auto-save debouncer could go here
watch(content, (newVal) => {
  emit('update:content', newVal)
})

function toggleMode(newMode: 'visual' | 'source') {
  mode.value = newMode
}
</script>
