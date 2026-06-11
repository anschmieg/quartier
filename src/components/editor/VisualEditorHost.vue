<template>
  <MilkdownProvider>
    <ProsemirrorAdapterProvider>
      <MilkdownEditor
        ref="editorRef"
        :model-value="modelValue"
        :editable="editable"
        :room-id="roomId"
        :user-email="userEmail"
        :enable-collab="enableCollab"
        :show-comments="showComments"
        @update:model-value="$emit('update:modelValue', $event)"
        @trigger-citation="$emit('triggerCitation', $event)"
        @dismiss-citation="$emit('dismissCitation')"
      />
    </ProsemirrorAdapterProvider>
  </MilkdownProvider>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MilkdownProvider } from '@milkdown/vue'
import { ProsemirrorAdapterProvider } from '@prosemirror-adapter/vue'
import MilkdownEditor from './MilkdownEditor.vue'

withDefaults(defineProps<{
  modelValue: string
  editable?: boolean
  roomId?: string
  userEmail?: string
  enableCollab?: boolean
  showComments?: boolean
}>(), {
  editable: true,
  roomId: undefined,
  userEmail: undefined,
  enableCollab: false,
  showComments: false,
})

defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'triggerCitation', value: { coords: { x: number; y: number }; query: string }): void
  (event: 'dismissCitation'): void
}>()

const editorRef = ref<InstanceType<typeof MilkdownEditor> | null>(null)

defineExpose({
  getEditor: () => editorRef.value?.getEditor?.(),
  insertCitation: (key: string) => editorRef.value?.insertCitation?.(key),
  insertCallout: (type?: string) => editorRef.value?.insertCallout?.(type),
  insertFencedDiv: (kind?: string) => editorRef.value?.insertFencedDiv?.(kind),
})
</script>
