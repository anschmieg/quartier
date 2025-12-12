<template>
  <div class="flex flex-col h-screen bg-background text-foreground overflow-hidden">
    <!-- Header -->
    <AppHeader 
      :can-save="!!currentFile"
      :sidebar-visible="showSidebar"
      :show-preview="showPreview"
      :editor-mode="editorMode"
      :editor-instance="editorInstance"
      @command-palette="openCommandPalette"
      @save="saveFile"
      @toggle-sidebar="showSidebar = !showSidebar"
      @update:show-preview="showPreview = $event"
      @update:editor-mode="editorMode = $event"
    />

    <!-- Main Layout -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <AppSidebar 
        :visible="showSidebar"
        :repo="repo"
        :selected-file="currentFile"
        @open-repo-selector="showRepoSelector = true"
        @select-file="selectFile"
      />

      <!-- Main Content -->
      <main class="flex-1 flex flex-col h-full min-w-0 bg-background/50 transition-all duration-150">
        <!-- Editor/Preview Split -->
        <div class="flex-1 flex overflow-hidden relative">
          <div 
            :class="showPreview ? 'w-1/2' : 'w-full'" 
            class="h-full overflow-hidden transition-all duration-150"
          >
            <EditorWrapper 
              ref="editorWrapperRef"
              :initial-content="fileContent"
              :mode="editorMode"
              @update:content="updateContent"
            />
          </div>
          
          <!-- Preview Panel with Fade Animation -->
          <Transition
            enter-active-class="transition-opacity duration-200"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition-opacity duration-150"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
            mode="out-in"
          >
            <PreviewPanel 
              v-if="showPreview" 
              :content="fileContent"
              class="absolute right-0 top-0 bottom-0 w-1/2 border-l border-border/50"
            />
          </Transition>
        </div>
      </main>
    </div>

    <!-- Modals -->
    <CommandPalette ref="commandPaletteRef" :files="[]" @select="selectFile" />
    <RepoSelector v-model:open="showRepoSelector" @select="handleRepoSelect" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useStorage } from '@vueuse/core'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import EditorWrapper from '@/components/editor/EditorWrapper.vue'
import PreviewPanel from '@/components/preview/PreviewPanel.vue'
import CommandPalette from '@/components/command/CommandPalette.vue'
import RepoSelector from '@/components/github/RepoSelector.vue'
import { useMagicKeys, whenever } from '@vueuse/core'
import { githubService } from '@/services/github'

// Persisted State (localStorage)
const repo = useStorage<string | undefined>('quartier:repo', undefined)
const currentFile = useStorage<string | null>('quartier:currentFile', null)
const showSidebar = useStorage('quartier:showSidebar', true)
const showPreview = useStorage('quartier:showPreview', false)
const editorMode = useStorage<'visual' | 'source'>('quartier:editorMode', 'visual')

// Transient State (not persisted)
const fileContent = ref('')
const fileLoading = ref(false)
const commandPaletteRef = ref()
const showRepoSelector = ref(false)
const editorWrapperRef = ref<InstanceType<typeof EditorWrapper> | null>(null)

// Computed editor instance from EditorWrapper ref
const editorInstance = computed(() => {
  // EditorWrapper exposes MilkdownEditor via milkdownRef, which exposes editor
  // @ts-ignore - accessing nested ref
  return editorWrapperRef.value?.milkdownRef?.editor
})

// Keyboard shortcuts
const { Meta_K, Ctrl_K } = useMagicKeys()
whenever(() => Meta_K?.value || Ctrl_K?.value, () => openCommandPalette())

// Restore file content on mount
onMounted(async () => {
  if (repo.value && currentFile.value) {
    console.log('[AppLayout] Restoring file on mount:', currentFile.value)
    await selectFile(currentFile.value)
  }
})

function openCommandPalette() {
  commandPaletteRef.value?.open()
}

async function selectFile(path: string) {
  if (!repo.value) return
  
  const [owner, name] = repo.value.split('/')
  if (!owner || !name) return
  
  try {
    fileLoading.value = true
    currentFile.value = path
    fileContent.value = 'Loading...'
    
    console.log('Loading file:', path)
    const content = await githubService.readFile(owner, name, path)
    
    fileContent.value = content
    console.log('File loaded successfully, length:', content.length)
  } catch (error) {
    console.error('Failed to load file:', error)
    fileContent.value = `# Error loading file\n\nFailed to load ${path}:\n${error instanceof Error ? error.message : 'Unknown error'}`
  } finally {
    fileLoading.value = false
  }
}

function updateContent(newContent: string) {
  fileContent.value = newContent
}

async function saveFile() {
  if (currentFile.value) {
    console.log('Saving:', currentFile.value)
    // TODO: Implement save to GitHub
  }
}

function handleRepoSelect(selectedRepo: { owner: string, name: string, full_name: string }) {
  repo.value = selectedRepo.full_name
  currentFile.value = null
  fileContent.value = ''
}
</script>
