<template>
  <div class="milkdown-editor h-full overflow-auto">
    <Milkdown />
  </div>
</template>

<script setup lang="ts">
import { Milkdown, useEditor } from '@milkdown/vue'
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { math } from '@milkdown/plugin-math'
import { diagram } from '@milkdown/plugin-diagram'
import { clipboard } from '@milkdown/plugin-clipboard'
import { history } from '@milkdown/plugin-history'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { nord } from '@milkdown/theme-nord'
import { watch, onBeforeUnmount } from 'vue'

const props = defineProps<{
  modelValue: string
  editable?: boolean
}>()

const emit = defineEmits(['update:modelValue'])

let editorInstance: Editor | null = null

const { get } = useEditor((root) => {
  const editor = Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
      ctx.set(defaultValueCtx, props.modelValue)
      
      // Listen to markdown changes
      ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
        emit('update:modelValue', markdown)
      })
    })
    .config(nord)
    .use(commonmark)
    .use(gfm)
    .use(math)
    .use(diagram)
    .use(clipboard)
    .use(history)
    .use(listener)
    
  editorInstance = editor
  return editor
})

// Watch for external changes (e.g., from source mode)
watch(() => props.modelValue, (newValue) => {
  const editor = get()
  if (!editor) return
  
  // Get current markdown to avoid infinite loops
  editor.action((ctx) => {
    const currentMarkdown = ctx.get(defaultValueCtx)
    if (currentMarkdown !== newValue) {
      // Update editor content
      ctx.set(defaultValueCtx, newValue)
      editor.create()
    }
  })
})

// Cleanup
onBeforeUnmount(() => {
  editorInstance?.destroy()
})

// Expose editor for toolbar
defineExpose({
  editor: editorInstance
})
</script>

<style scoped>
/* Milkdown editor custom styling */
.milkdown-editor {
  font-family: var(--font-sans);
  line-height: 1.7;
}

/* Prose-like styling for readability */
.milkdown-editor :deep(.milkdown) {
  padding: 2rem 1rem;
  max-width: 65ch;
  margin: 0 auto;
}

/* Headings */
.milkdown-editor :deep(h1) {
  font-size: 2.25em;
  font-weight: 700;
  margin-top: 0;
  margin-bottom: 0.8rem;
  line-height: 1.1;
}

.milkdown-editor :deep(h2) {
  font-size: 1.875em;
  font-weight: 700;
  margin-top: 2em;
  margin-bottom: 1em;
  line-height: 1.3;
}

.milkdown-editor :deep(h3) {
  font-size: 1.5em;
  font-weight: 600;
  margin-top: 1.6em;
  margin-bottom: 0.6em;
  line-height: 1.4;
}

/* Lists */
.milkdown-editor :deep(ul),
.milkdown-editor :deep(ol) {
  margin-top: 1.25em;
  margin-bottom: 1.25em;
  padding-left: 1.625em;
}

.milkdown-editor :deep(li) {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

/* Code blocks */
.milkdown-editor :deep(pre) {
  background: hsl(var(--muted));
  border-radius: 0.375rem;
  padding: 1rem;
  overflow-x: auto;
  font-size: 0.875em;
  line-height: 1.7;
}

.milkdown-editor :deep(code) {
  background: hsl(var(--muted));
  padding: 0.2em 0.4em;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

.milkdown-editor :deep(pre code) {
  background: transparent;
  padding: 0;
}

/* Blockquotes */
.milkdown-editor :deep(blockquote) {
  border-left: 4px solid hsl(var(--muted-foreground) / 0.3);
  padding-left: 1em;
  margin-left: 0;
  font-style: italic;
  color: hsl(var(--muted-foreground));
}

/* Links */
.milkdown-editor :deep(a) {
  color: hsl(var(--primary));
  text-decoration: underline;
}

/* Tables */
.milkdown-editor :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1.5em 0;
}

.milkdown-editor :deep(th),
.milkdown-editor :deep(td) {
  border: 1px solid hsl(var(--border));
  padding: 0.5em 1em;
  text-align: left;
}

.milkdown-editor :deep(th) {
  background: hsl(var(--muted));
  font-weight: 600;
}
</style>
