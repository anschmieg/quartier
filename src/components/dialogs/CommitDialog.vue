<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Commit to GitHub</DialogTitle>
        <DialogDescription>
          Committing changes to <code class="text-sm bg-muted px-1 py-0.5 rounded">{{ filePath }}</code>
        </DialogDescription>
      </DialogHeader>
      
      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <label for="commit-message" class="text-sm font-medium">Commit message</label>
          <input
            id="commit-message"
            v-model="message"
            type="text"
            :placeholder="defaultMessage"
            class="w-full px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            @keydown.enter="handleConfirm"
            ref="inputRef"
          />
        </div>
      </div>
      
      <DialogFooter class="gap-2 sm:gap-0">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
          @click="handleCancel"
        >
          Cancel
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          @click="handleConfirm"
          :disabled="!message.trim()"
        >
          <GitCommit class="w-4 h-4 mr-2 inline" />
          Commit
        </button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog'
import { GitCommit } from 'lucide-vue-next'

const props = defineProps<{
  filePath: string
}>()

const emit = defineEmits<{
  confirm: [message: string]
  cancel: []
}>()

const isOpen = ref(false)
const message = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

const defaultMessage = computed(() => `Update ${props.filePath}`)

// Focus input when dialog opens
watch(isOpen, async (open) => {
  if (open) {
    message.value = defaultMessage.value
    await nextTick()
    inputRef.value?.select()
  }
})

function open() {
  isOpen.value = true
}

function handleConfirm() {
  if (!message.value.trim()) return
  emit('confirm', message.value.trim())
  isOpen.value = false
  message.value = ''
}

function handleCancel() {
  emit('cancel')
  isOpen.value = false
  message.value = ''
}

defineExpose({ open })
</script>

<script lang="ts">
import { computed } from 'vue'
</script>
