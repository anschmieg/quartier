<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Welcome to Guest Mode</DialogTitle>
        <DialogDescription>
          You have joined a live collaboration session.
        </DialogDescription>
      </DialogHeader>
      
      <div class="space-y-4 py-2">
        <div class="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
          <Edit3 class="w-5 h-5 text-primary mt-0.5" />
          <div class="space-y-1">
            <h4 class="text-sm font-medium">Live Editing</h4>
            <p class="text-xs text-muted-foreground">
              You can edit files in real-time. Changes are synced instantly with the host and other guests.
            </p>
          </div>
        </div>

        <div class="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
          <HardDrive class="w-5 h-5 text-muted-foreground mt-0.5" />
          <div class="space-y-1">
            <h4 class="text-sm font-medium">No File System Access</h4>
            <p class="text-xs text-muted-foreground">
              Files are not written to the original storage, but are saved online and synced to the host. Only files shared by the host are visible.
            </p>
          </div>
        </div>
      </div>
      
      <DialogFooter>
        <Button @click="close" class="w-full">Start Collaborating</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Edit3, HardDrive } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'close': []
}>()

const isOpen = ref(props.open)

watch(() => props.open, (val) => {
  isOpen.value = val
})

watch(isOpen, (val) => {
  emit('update:open', val)
  if (!val) emit('close')
})

function close() {
  isOpen.value = false
}
</script>
