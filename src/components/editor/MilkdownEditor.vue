<template>
  <div class="crepe-editor h-full" ref="editorRef"></div>
</template>

<script setup lang="ts">
import { Crepe } from '@milkdown/crepe'
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

// Import Crepe styles
import '@milkdown/crepe/theme/common/style.css'

const props = defineProps<{
  modelValue: string
  editable?: boolean
}>()

const emit = defineEmits(['update:modelValue'])

const editorRef = ref<HTMLElement>()
let crepeInstance: Crepe | null = null
let observer: MutationObserver | null = null
let lastMarkdown = ''

// Setup mutation observer to track changes
function setupObserver() {
  if (!editorRef.value || !crepeInstance) return
  
  // Cleanup existing observer
  if (observer) {
    observer.disconnect()
  }
  
  lastMarkdown = crepeInstance.getMarkdown()
  
  observer = new MutationObserver(() => {
    const currentMarkdown = crepeInstance?.getMarkdown() ?? ''
    if (currentMarkdown !== lastMarkdown) {
      lastMarkdown = currentMarkdown
      emit('update:modelValue', currentMarkdown)
    }
  })
  
  observer.observe(editorRef.value, {
    childList: true,
    subtree: true,
    characterData: true,
  })
}

onMounted(async () => {
  if (!editorRef.value) return
  
  crepeInstance = new Crepe({
    root: editorRef.value,
    defaultValue: props.modelValue,
  })
  
  await crepeInstance.create()
  setupObserver()
})

// Watch for external changes (from source mode)
watch(() => props.modelValue, async (newValue) => {
  if (!crepeInstance) return
  
  const currentMarkdown = crepeInstance.getMarkdown()
  if (newValue !== currentMarkdown) {
    // Recreate editor with new value
    // This is the only way to update content in Crepe
    if (observer) {
      observer.disconnect()
    }
    crepeInstance.destroy()
    
    if (editorRef.value) {
      crepeInstance = new Crepe({
        root: editorRef.value,
        defaultValue: newValue,
      })
      await crepeInstance.create()
      setupObserver() // Re-setup observer after recreate
    }
  }
})

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  crepeInstance?.destroy()
  crepeInstance = null
})

defineExpose({
  crepe: crepeInstance,
})
</script>

<style scoped>
.crepe-editor {
  width: 100%;
  height: 100%;
}

/* Override Crepe theme with our Tailwind variables */
.crepe-editor :deep(.crepe) {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: var(--font-sans);
}

.crepe-editor :deep(.ProseMirror) {
  padding: 2rem 1rem;
  max-width: 65ch;
  margin: 0 auto;
  min-height: 100%;
  outline: none;
}

.crepe-editor :deep(.ProseMirror h1) {
  font-size: 2.25em;
  font-weight: 700;
  margin-top: 0;
  line-height: 1.1;
}

.crepe-editor :deep(.ProseMirror h2) {
  font-size: 1.875em;
  font-weight: 700;
  margin-top: 2em;
  line-height: 1.3;
}

.crepe-editor :deep(.ProseMirror h3) {
  font-size: 1.5em;
  font-weight: 600;
  margin-top: 1.6em;
  line-height: 1.4;
}

.crepe-editor :deep(.ProseMirror code) {
  background-color: hsl(var(--muted));
  padding: 0.2em 0.4em;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

.crepe-editor :deep(.ProseMirror pre) {
  background-color: hsl(var(--muted));
  border-radius: 0.375rem;
  padding: 1rem;
  overflow-x: auto;
}

.crepe-editor :deep(.ProseMirror pre code) {
  background: transparent;
  padding: 0;
}

.crepe-editor :deep(.ProseMirror a) {
  color: hsl(var(--primary));
  text-decoration: underline;
}

.crepe-editor :deep(.ProseMirror blockquote) {
  border-left: 4px solid hsl(var(--muted-foreground) / 0.3);
  padding-left: 1em;
  margin-left: 0;
  font-style: italic;
  color: hsl(var(--muted-foreground));
}
</style>
