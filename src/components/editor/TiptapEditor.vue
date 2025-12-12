<template>
  <div class="tiptap-editor h-full">
    <EditorBubbleMenu :editor="editor" />
    <editor-content 
      :editor="editor" 
      class="prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[500px] p-4" 
    />
  </div>
</template>

<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { watch, computed } from 'vue'
import Collaboration from '@tiptap/extension-collaboration'
import EditorBubbleMenu from './EditorBubbleMenu.vue'
import { useCollaboration } from '@/composables/useCollaboration'

const props = defineProps<{
  modelValue: string
  editable?: boolean
  documentId?: string
}>()

const emit = defineEmits(['update:modelValue', 'synced', 'connected'])

// Use collaboration composable for Yjs providers
const { ydoc, isSynced, isConnected, providerType } = useCollaboration({
  documentId: props.documentId || 'default',
})

// Emit synced event when IndexedDB sync completes
watch(isSynced, (synced) => {
  if (synced) emit('synced')
})

// Emit connected event when network provider connects
watch(isConnected, (connected) => {
  emit('connected', connected)
})

// Expose connection status
const connectionStatus = computed(() => ({
  synced: isSynced.value,
  connected: isConnected.value,
  provider: providerType.value,
}))

const editor = useEditor({
  content: props.modelValue,
  editable: props.editable !== false,
  extensions: [
    StarterKit.configure({
      // Disable conflicting extensions from StarterKit
      // that we'll configure separately or via Markdown
    }),
    Markdown.configure({
      html: true,                  // HTML tags allowed in markdown
      tightLists: false,            // Add <p> tags inside <li>
      tightListClass: 'tight',     // Apply class to tight lists
      bulletListMarker: '-',       // Use - for bullet lists
      linkify: true,               // Convert URLs to links
      breaks: true,                // Convert line breaks
      transformPastedText: true,   // Auto-convert pasted markdown
      transformCopiedText: true,   // Convert to markdown on copy
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-primary underline',
      },
    }),
    Image.configure({
      HTMLAttributes: {
        class: 'max-w-full rounded-lg',
      },
    }),
    Placeholder.configure({
      placeholder: 'Start writing...',
    }),
    Collaboration.configure({
      document: ydoc,
    }),
  ],
  editorProps: {
    attributes: {
      class: 'focus:outline-none h-full',
    },
  },
  onUpdate: ({ editor }) => {
    // @ts-expect-error - tiptap-markdown storage type
    const markdown = editor.storage.markdown?.getMarkdown?.() ?? ''
    emit('update:modelValue', markdown)
  },
})

// Expose editor and connection status for parent components
defineExpose({ editor, connectionStatus })

// Watch for external changes (e.g. from CodeEditor or file load)
watch(() => props.modelValue, (newValue) => {
  if (!editor.value) return
  
  // @ts-expect-error - tiptap-markdown storage type
  const currentMarkdown = editor.value.storage.markdown?.getMarkdown?.() ?? ''
  
  // Only update if content actually changed (avoid infinite loops)
  if (currentMarkdown !== newValue) {
    // Set content as markdown string, let the Markdown extension parse it
    editor.value.commands.setContent(newValue)
  }
})
</script>

<style>
.ProseMirror {
  outline: none;
  min-height: 100%;
}

.ProseMirror p.is-editor-empty:first-child::before {
  color: hsl(var(--muted-foreground));
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
</style>
