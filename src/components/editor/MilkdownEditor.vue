<template>
  <div class="crepe-editor h-full" ref="editorRef"></div>
</template>

<script setup lang="ts">
import { Crepe } from '@milkdown/crepe'
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

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

<style>
/* 
  CRITICAL: Do NOT import Crepe theme CSS files
  They override our dark mode and use their own colors
  We implement everything ourselves for full control
*/

.crepe-editor {
  width: 100%;
  height: 100%;
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}

/* ============================================
   CORE EDITOR BACKGROUND - CRITICAL FOR DARK MODE
   ============================================ */
.crepe-editor :deep(.milkdown),
.crepe-editor :deep(.ProseMirror) {
  background-color: hsl(var(--background)) !important;
  color: hsl(var(--foreground)) !important;
  font-family: var(--font-sans) !important;
  padding: 2rem 1rem;
  max-width: 65ch;
  margin: 0 auto;
  min-height: 100%;
  outline: none;
  caret-color: hsl(var(--foreground)) !important;
}

/* ============================================
   MENUS & POPOVERS - FIX TRANSPARENT BACKGROUNDS
   ============================================ */
.crepe-editor :deep(.milkdown-menu),
.crepe-editor :deep([role="menu"]),
.crepe-editor :deep([role="listbox"]),
.crepe-editor :deep(.tippy-box),
.crepe-editor :deep(.tippy-content) {
  background-color: hsl(var(--popover)) !important;
  border: 1px solid hsl(var(--border)) !important;
  box-shadow: 0 4px 12px -4px rgb(0 0 0 / 0.3) !important;
  color: hsl(var(--popover-foreground)) !important;
}

.crepe-editor :deep(.milkdown-menu-item),
.crepe-editor :deep([role="menuitem"]),
.crepe-editor :deep([role="option"]) {
  color: hsl(var(--popover-foreground)) !important;
  background-color: transparent !important;
}

.crepe-editor :deep(.milkdown-menu-item:hover),
.crepe-editor :deep([role="menuitem"]:hover),
.crepe-editor :deep([role="option"]:hover) {
  background-color: hsl(var(--accent)) !important;
  color: hsl(var(--accent-foreground)) !important;
}

.crepe-editor :deep(.tippy-arrow) {
  color: hsl(var(--popover)) !important;
}

/* ============================================
   ICONS - FIX BLACK ICONS IN DARK MODE
   ============================================ */
.crepe-editor :deep(svg),
.crepe-editor :deep(.icon) {
  color: hsl(var(--foreground)) !important;
  fill: currentColor !important;
  stroke: currentColor !important;
}

/* ============================================
   DRAG HANDLES & BLOCK CONTROLS
   ============================================ */
.crepe-editor :deep([data-drag-handle]),
.crepe-editor :deep(.drag-handle) {
  color: hsl(var(--muted-foreground)) !important;
  background-color: hsl(var(--background)) !important;
  border: 1px solid hsl(var(--border)) !important;
  cursor: grab !important;
  opacity: 0 !important;
  transition: opacity 0.2s ease !important;
}

.crepe-editor :deep(.ProseMirror-selectednode [data-drag-handle]),
.crepe-editor :deep(.has-focus [data-drag-handle]),
.crepe-editor :deep([data-drag-handle]:hover) {
  opacity: 1 !important;
}

/* Plus button for adding blocks */
.crepe-editor :deep([data-block-menu-trigger]) {
  background-color: hsl(var(--accent)) !important;
  color: hsl(var(--accent-foreground)) !important;
  border: 1px solid hsl(var(--border)) !important;
  opacity: 0 !important;
  transition: opacity 0.2s ease !important;
}

.crepe-editor :deep(.ProseMirror-selectednode [data-block-menu-trigger]),
.crepe-editor :deep(.has-focus [data-block-menu-trigger]),
.crepe-editor :deep([data-block-menu-trigger]:hover) {
  opacity: 1 !important;
}

/* ============================================
   TYPOGRAPHY - FIX SERIF FONTS
   ============================================ */
.crepe-editor :deep(.ProseMirror h1),
.crepe-editor :deep(.ProseMirror h2),
.crepe-editor :deep(.ProseMirror h3),
.crepe-editor :deep(.ProseMirror h4),
.crepe-editor :deep(.ProseMirror h5),
.crepe-editor :deep(.ProseMirror h6) {
  font-family: var(--font-sans) !important;
  color: hsl(var(--foreground)) !important;
  font-weight: 700 !important;
}

.crepe-editor :deep(.ProseMirror h1) {
  font-size: 2.25em;
  margin-top: 0;
  margin-bottom: 0.8rem;
  line-height: 1.1;
}

.crepe-editor :deep(.ProseMirror h2) {
  font-size: 1.875em;
  margin-top: 2em;
  margin-bottom: 1em;
  line-height: 1.3;
}

.crepe-editor :deep(.ProseMirror h3) {
  font-size: 1.5em;
  font-weight: 600 !important;
  margin-top: 1.6em;
  margin-bottom: 0.6em;
  line-height: 1.4;
}

.crepe-editor :deep(.ProseMirror p) {
  font-family: var(--font-sans) !important;
  color: hsl(var(--foreground)) !important;
}

/* ============================================
   CODE BLOCKS
   ============================================ */
.crepe-editor :deep(.ProseMirror code) {
  background-color: hsl(var(--muted)) !important;
  color: hsl(var(--foreground)) !important;
  padding: 0.2em 0.4em;
  border-radius: 0.25rem;
  font-size: 0.875em;
  font-family: var(--font-mono) !important;
}

.crepe-editor :deep(.ProseMirror pre) {
  background-color: hsl(var(--muted)) !important;
  color: hsl(var(--foreground)) !important;
  border-radius: 0.375rem;
  padding: 1rem;
  overflow-x: auto;
  font-family: var(--font-mono) !important;
}

.crepe-editor :deep(.ProseMirror pre code) {
  background: transparent !important;
  padding: 0;
}

/* ============================================
   LINKS
   ============================================ */
.crepe-editor :deep(.ProseMirror a) {
  color: hsl(var(--primary)) !important;
  text-decoration: underline;
}

.crepe-editor :deep(.ProseMirror a:hover) {
  color: hsl(var(--primary) / 0.8) !important;
}

/* ============================================
   BLOCKQUOTES
   ============================================ */
.crepe-editor :deep(.ProseMirror blockquote) {
  border-left: 4px solid hsl(var(--muted-foreground) / 0.3);
  padding-left: 1em;
  margin-left: 0;
  font-style: italic;
  color: hsl(var(--muted-foreground)) !important;
}

/* ============================================
   LISTS
   ============================================ */
.crepe-editor :deep(.ProseMirror ul),
.crepe-editor :deep(.ProseMirror ol) {
  color: hsl(var(--foreground)) !important;
}

.crepe-editor :deep(.ProseMirror li) {
  color: hsl(var(--foreground)) !important;
}

/* ============================================
   SELECTION
   ============================================ */
.crepe-editor :deep(.ProseMirror)::selection,
.crepe-editor :deep(.ProseMirror *::selection) {
  background-color: hsl(var(--accent)) !important;
}

.crepe-editor :deep(.ProseMirror-selectednode) {
  outline: 2px solid hsl(var(--primary) / 0.5) !important;
  outline-offset: 2px;
}

/* ============================================
   PLACEHOLDER
   ============================================ */
.crepe-editor :deep(.ProseMirror .placeholder),
.crepe-editor :deep(.ProseMirror [data-placeholder])::before {
  color: hsl(var(--muted-foreground)) !important;
  opacity: 0.5;
}

/* ============================================
   TABLES
   ============================================ */
.crepe-editor :deep(.ProseMirror table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1.5em 0;
}

.crepe-editor :deep(.ProseMirror th),
.crepe-editor :deep(.ProseMirror td) {
  border: 1px solid hsl(var(--border)) !important;
  padding: 0.5em 1em;
  background-color: hsl(var(--background)) !important;
  color: hsl(var(--foreground)) !important;
}

.crepe-editor :deep(.ProseMirror th) {
  background-color: hsl(var(--muted)) !important;
  font-weight: 600;
}
</style>
