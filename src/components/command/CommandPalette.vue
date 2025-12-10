<template>
  <CommandDialog v-model:open="isOpen">
    <CommandInput placeholder="Type a command or search..." />
    <CommandList>
      <CommandEmpty>No results found.</CommandEmpty>
      <CommandGroup heading="Actions">
        <CommandItem value="save" @select="handleAction('save')">
          <Save class="mr-2 h-4 w-4" />
          <span>Save File</span>
          <CommandShortcut>⌘S</CommandShortcut>
        </CommandItem>
        <CommandItem value="commit" @select="handleAction('commit')">
          <GitBranch class="mr-2 h-4 w-4" />
          <span>Commit to GitHub</span>
        </CommandItem>
        <CommandItem value="toggle-mode" @select="handleAction('toggle')">
          <ArrowLeftRight class="mr-2 h-4 w-4" />
          <span>Toggle Visual/Source</span>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { 
  CommandDialog, 
  CommandInput, 
  CommandList, 
  CommandEmpty, 
  CommandGroup, 
  CommandItem, 
  CommandShortcut 
} from '@/components/ui/command'
import { Save, GitBranch, ArrowLeftRight } from 'lucide-vue-next'

const isOpen = ref(false)

function open() {
  isOpen.value = true
}

function handleAction(action: string) {
  console.log('Action triggered:', action)
  isOpen.value = false
  // In a real app, we would emit an event or use a global store to trigger the action
}

defineExpose({ open })
</script>
