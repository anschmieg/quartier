<template>
  <CommandDialog v-model:open="isOpen">
    <CommandInput placeholder="Type a command or search..." />
    <CommandList>
      <CommandEmpty>No results found.</CommandEmpty>
      
      <!-- File Commands -->
      <CommandGroup heading="File">
        <CommandItem value="save" @select="execute('save')">
          <Save class="mr-2 h-4 w-4" />
          <span>Save / Commit</span>
          <CommandShortcut>⌘S</CommandShortcut>
        </CommandItem>
        <CommandItem value="new-file" @select="execute('new-file')">
          <FilePlus class="mr-2 h-4 w-4" />
          <span>New File</span>
        </CommandItem>
      </CommandGroup>
      
      <!-- View Commands -->
      <CommandGroup heading="View">
        <CommandItem value="toggle-sidebar" @select="execute('toggle-sidebar')">
          <PanelLeft class="mr-2 h-4 w-4" />
          <span>Toggle Sidebar</span>
          <CommandShortcut>⌘B</CommandShortcut>
        </CommandItem>
        <CommandItem value="toggle-preview" @select="execute('toggle-preview')">
          <Eye class="mr-2 h-4 w-4" />
          <span>Toggle Preview</span>
          <CommandShortcut>⌘P</CommandShortcut>
        </CommandItem>
        <CommandItem value="toggle-mode" @select="execute('toggle-mode')">
          <ArrowLeftRight class="mr-2 h-4 w-4" />
          <span>Toggle Visual/Source Mode</span>
        </CommandItem>
      </CommandGroup>
      
      <!-- Navigation Commands -->
      <CommandGroup heading="Go To">
        <CommandItem value="go-to-repo" @select="execute('go-to-repo')">
          <FolderGit2 class="mr-2 h-4 w-4" />
          <span>Switch Repository</span>
        </CommandItem>
      </CommandGroup>
      
      <!-- Recent Files (if available) -->
      <CommandGroup v-if="recentFiles.length > 0" heading="Recent Files">
        <CommandItem 
          v-for="file in recentFiles" 
          :key="file" 
          :value="'file:' + file"
          @select="execute('open-file', file)"
        >
          <FileText class="mr-2 h-4 w-4" />
          <span>{{ file }}</span>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  CommandDialog, 
  CommandInput, 
  CommandList, 
  CommandEmpty, 
  CommandGroup, 
  CommandItem, 
  CommandShortcut 
} from '@/components/ui/command'
import { 
  Save, 
  FilePlus, 
  PanelLeft, 
  Eye, 
  ArrowLeftRight, 
  FolderGit2,
  FileText
} from 'lucide-vue-next'

const props = defineProps<{
  files?: string[]
  currentFile?: string | null
}>()

const emit = defineEmits<{
  action: [name: string, payload?: unknown]
  select: [file: string]
}>()

const isOpen = ref(false)

// Get recent files from props (last 5)
const recentFiles = computed(() => {
  return (props.files || []).slice(0, 5)
})

function open() {
  isOpen.value = true
}

function execute(action: string, payload?: unknown) {
  isOpen.value = false
  
  if (action === 'open-file' && typeof payload === 'string') {
    emit('select', payload)
  } else {
    emit('action', action, payload)
  }
}

defineExpose({ open })
</script>
