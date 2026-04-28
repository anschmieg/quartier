<template>
  <div class="h-full flex flex-col">
    <!-- Save Status (hidden for now - was distracting)
    <div class="absolute top-2 right-3 z-10">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-300"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <span v-if="saving" class="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 class="w-3 h-3 animate-spin" />
          Saving...
        </span>
        <span v-else-if="saved" class="text-xs text-muted-foreground/70 flex items-center gap-1">
          <Check class="w-3 h-3" />
          Saved
        </span>
      </Transition>
    </div>
    -->

    <!-- Editors -->
    <div class="flex-1 overflow-hidden relative">
      <MilkdownProvider>
        <ProsemirrorAdapterProvider>
          <Transition
            enter-active-class="transition-opacity duration-150"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition-opacity duration-100"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
            mode="out-in"
          >
            <div v-if="mode === 'visual' && !reloading" key="visual" class="h-full overflow-auto">
              <MilkdownEditor 
                ref="milkdownRef"
                :key="roomId"
                v-model="content"
                :editable="true"
                :roomId="roomId"
                :userEmail="userEmail"
                :enableCollab="enableCollab"
                :showComments="showComments"
                @trigger-citation="handleTriggerCitation"
                @dismiss-citation="closeCitationMenu"
              />
            </div>
            <div v-else key="source" class="h-full overflow-auto">
              <CodeEditor 
                v-model="content"
                :filename="filename"
              />
            </div>
          </Transition>
        </ProsemirrorAdapterProvider>
      </MilkdownProvider>
    </div>

    <!-- Citation Menu -->
    <InlineCitationMenu
      v-if="citationState.visible"
      :visible="citationState.visible"
      :coords="citationState.coords"
      :project-bib="projectBib"
      @select="handleCitationSelect"
      @close="closeCitationMenu"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { MilkdownProvider } from '@milkdown/vue'
import { ProsemirrorAdapterProvider } from '@prosemirror-adapter/vue'
import CodeEditor from './CodeEditor.vue'
import MilkdownEditor from './MilkdownEditor.vue'
import InlineCitationMenu from '@/components/citations/InlineCitationMenu.vue'
import type { CitationItem } from '@/services/citations/types'
import { bibtexService } from '@/services/citations/bibtex'
import { useWorkspaceSession } from '@/composables/useWorkspaceSession'



// Reference to the Milkdown component to access exposed methods
const milkdownRef = ref<any>(null)

const props = defineProps<{
  initialContent: string
  mode: 'visual' | 'source'
  roomId?: string
  userEmail?: string
  enableCollab?: boolean
  filename?: string
  showComments?: boolean
}>()

const emit = defineEmits(['update:content', 'save'])
const workspaceSession = useWorkspaceSession()

// Citation State
const citationState = ref({
  visible: false,
  coords: { x: 0, y: 0 },
  query: ''
})

const projectBib = ref('')

// Helper to get the underlying editor instance
const getMilkdownEditor = () => {
  return milkdownRef.value?.getEditor?.()
}

// Handlers
const handleTriggerCitation = (e: { coords: { x: number, y: number }, query: string }) => {
  citationState.value = {
    visible: true,
    coords: e.coords,
    query: e.query
  }
  loadProjectRef()
}

const closeCitationMenu = () => {
  citationState.value.visible = false
}

const loadProjectRef = async () => {
  // Try to load references.bib from the current project root
  // We assume relative path 'references.bib'
  try {
     const fs = workspaceSession.getProvider()
     const handle = workspaceSession.state.activeHandle
     
     if (!props.filename || !fs || !handle) return
     
     const folder = props.filename.substring(0, props.filename.lastIndexOf('/'))
     const bibPath = folder ? `${folder}/references.bib` : 'references.bib'
     
     // This is a "best guess" or we could enforce a standard
     // But we can check if file exists via generic read?
     // Provider interface reads by absolute path usually.
     // Let's try reading
     const snapshot = await fs.readDocument(handle, bibPath)
     projectBib.value = snapshot.content || ''
     
     // Update global citations for rendering
     await bibtexService.update(snapshot.content || '')
  } catch (e) {
     projectBib.value = ''
     await bibtexService.update('')
  }
}

// Watch filename to load refs immediately
watch(() => props.filename, loadProjectRef, { immediate: true })

const handleCitationSelect = async (item: CitationItem) => {
   const key = bibtexService.generateKey(item)
   
   // 1. Insert into Editor
   if (milkdownRef.value?.insertCitation) {
       milkdownRef.value.insertCitation(key)
   }
   
   // 2. Append to references.bib if needed
   if (item.source !== 'local') {
       try {
           const fs = workspaceSession.getProvider()
           const handle = workspaceSession.state.activeHandle
           
           if (!props.filename || !fs || !handle) return
           
           const folder = props.filename.substring(0, props.filename.lastIndexOf('/'))
           const bibPath = folder ? `${folder}/references.bib` : 'references.bib'
           
           const bibEntry = await bibtexService.toBibTex(item)
           
           // Append or Create
           let currentContent = ''
           try {
               currentContent = (await fs.readDocument(handle, bibPath)).content || ''
           } catch (e) {
               // file doesn't exist, create new
           }
           
           // Simple duplicate check (key based)
           if (!currentContent.includes(key)) {
               const newContent = currentContent + '\n\n' + bibEntry
               await fs.writeDocument(handle, bibPath, newContent)
               projectBib.value = newContent
               // Sync global service
               await bibtexService.update(newContent)
           }
       } catch (e) {
           console.error('Failed to update references.bib', e)
       }
   }
   
   closeCitationMenu()
}

// Expose so parent (AppLayout) can grab it
defineExpose({
  getMilkdownEditor
})



const content = ref(props.initialContent)
const saving = ref(false)
const saved = ref(false)

// Sync content when props change (e.g. file load)
const reloading = ref(false)

watch(() => [props.initialContent, props.filename], async ([newContent, newFilename], [_oldContent, oldFilename]) => {
  // If filename changed, force a brief unmount to reset the editor completely
  // This prevents Milkdown/ProseMirror from trying to "update" the existing instance with a new doc schema or plugins
  if (newFilename !== oldFilename) {
    reloading.value = true
    content.value = newContent as string
    saved.value = false
    
    // Wait for DOM update to unmount
    await nextTick()
    
    // Remount
    reloading.value = false
  } else {
    // Just content update
    content.value = newContent as string
    saved.value = false
  }
})

// Debounced content update and save indicator
let debounceTimeout: ReturnType<typeof setTimeout> | null = null

watch(content, (newVal) => {
  if (reloading.value) return // Don't trigger save during reload
  
  // Clear any pending debounce
  if (debounceTimeout) clearTimeout(debounceTimeout)
  
  // Show saving indicator immediately for feedback
  saving.value = true
  saved.value = false
  
  // Debounce the actual emit and save completion
  debounceTimeout = setTimeout(() => {
    emit('update:content', newVal)
    saving.value = false
    saved.value = true
  }, 300) // 300ms debounce
})
</script>
