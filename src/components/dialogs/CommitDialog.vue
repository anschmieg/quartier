<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle>Commit to GitHub</DialogTitle>
        <DialogDescription>
          Committing changes to <code class="text-sm bg-muted px-1 py-0.5 rounded">{{ filePath }}</code>
        </DialogDescription>
      </DialogHeader>
      
      <!-- Diff View -->
      <div v-if="showDiff" class="flex-1 min-h-0 overflow-hidden">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium">Changes</span>
          <span class="text-xs text-muted-foreground">
            {{ diffStats.additions }}+ {{ diffStats.deletions }}-
          </span>
        </div>
        <div class="border rounded-md bg-muted/30 p-3 max-h-64 overflow-auto font-mono text-xs">
          <div
            v-for="(line, idx) in diffLines.slice(0, 50)"
            :key="idx"
            :class="{
              'text-green-600 dark:text-green-400 bg-green-500/10': line.type === 'add',
              'text-red-600 dark:text-red-400 bg-red-500/10': line.type === 'del',
              'text-muted-foreground': line.type === 'same',
            }"
            class="py-0.5 px-2 -mx-2"
          >
            <span class="opacity-50 mr-2 select-none">{{ line.prefix }}</span>
            <span>{{ line.text }}</span>
          </div>
          <div v-if="diffLines.length > 50" class="text-muted-foreground italic pt-2">
            ... and {{ diffLines.length - 50 }} more lines
          </div>
        </div>
      </div>
      
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
import { ref, watch, nextTick, computed } from 'vue'
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
  originalContent?: string
  currentContent?: string
}>()

const emit = defineEmits<{
  confirm: [message: string]
  cancel: []
}>()

const isOpen = ref(false)
const message = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

const defaultMessage = computed(() => `Update ${props.filePath}`)

// Generate simple diff
const showDiff = computed(() => 
  props.originalContent !== undefined && 
  props.currentContent !== undefined && 
  props.originalContent !== props.currentContent
)

interface DiffLine {
  type: 'add' | 'del' | 'same'
  text: string
  prefix: string
}

const diffLines = computed((): DiffLine[] => {
  if (!props.originalContent || !props.currentContent) return []
  
  const origLines = props.originalContent.split('\n')
  const currLines = props.currentContent.split('\n')
  
  const lines: DiffLine[] = []
  const maxLen = Math.max(origLines.length, currLines.length)
  
  for (let i = 0; i < maxLen; i++) {
    const orig = origLines[i]
    const curr = currLines[i]
    
    if (orig === curr) {
      lines.push({ type: 'same', text: curr ?? '', prefix: ' ' })
    } else {
      if (orig !== undefined && !currLines.includes(orig)) {
        lines.push({ type: 'del', text: orig, prefix: '-' })
      }
      if (curr !== undefined && !origLines.includes(curr)) {
        lines.push({ type: 'add', text: curr, prefix: '+' })
      }
    }
  }
  
  return lines.filter(l => l.type !== 'same' || l.text.trim() !== '')
})

const diffStats = computed(() => ({
  additions: diffLines.value.filter(l => l.type === 'add').length,
  deletions: diffLines.value.filter(l => l.type === 'del').length,
}))

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

