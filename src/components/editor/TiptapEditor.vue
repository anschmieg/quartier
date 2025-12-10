<template>
  <editor-content :editor="editor" class="prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[500px]" />
</template>

<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'
import { watch, onBeforeUnmount } from 'vue'
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import Collaboration from '@tiptap/extension-collaboration'

const props = defineProps<{
  modelValue: string
  editable: boolean
}>()

const emit = defineEmits(['update:modelValue'])

// Y.js setup (mock room for now)
const ydoc = new Y.Doc()
// Random room name ensures isolation per refresh, strict string for persistent testing
const roomName = 'quarto-editor-demo-room'
const provider = new WebrtcProvider(roomName, ydoc)

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
    Markdown,
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
    // We get markdown from the editor
    const markdown = editor.storage.markdown.getMarkdown()
    emit('update:modelValue', markdown)
  },
})

// Watch for external changes (e.g. from CodeEditor)
watch(() => props.modelValue, (newValue) => {
  if (editor.value && editor.value.storage.markdown.getMarkdown() !== newValue) {
    // Only update if content is different to avoid cursor jumps
    // Note: In a real collaborative setting, we'd rely solely on Y.js updates, 
    // but for the "Code View" toggle, we manually sync.
    editor.value.commands.setContent(newValue)
  }
})

onBeforeUnmount(() => {
  provider.destroy()
  editor.value?.destroy()
})
</script>

<style>
/* Basic prose styling is handled by Tailwind typography plugin (if added) or custom css */
.ProseMirror {
  outline: none;
  min-height: 100%;
}
</style>
