<template>
  <div class="flex flex-col h-screen bg-background text-foreground overflow-hidden">
    <!-- Header -->
    <AppHeader 
      :can-save="!!currentFile"
      :sidebar-visible="showSidebar"
      @command-palette="openCommandPalette"
      @save="saveFile"
      @toggle-sidebar="showSidebar = !showSidebar"
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
      <main class="flex-1 flex flex-col h-full min-w-0">
        <!-- Editor Toolbar -->
        <div class="h-10 border-b border-border/50 flex items-center px-4 gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="sm" class="gap-1 h-7">
                <component :is="editorMode === 'visual' ? Eye : CodeIcon" class="w-3.5 h-3.5" />
                {{ editorMode === 'visual' ? 'Visual' : 'Source' }}
                <ChevronDown class="w-3 h-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem @select="editorMode = 'visual'">
                <Eye class="w-4 h-4 mr-2" /> Visual Editor
              </DropdownMenuItem>
              <DropdownMenuItem @select="editorMode = 'source'">
                <CodeIcon class="w-4 h-4 mr-2" /> Source Mode
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div class="flex-1" />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  class="h-7 w-7"
                  :class="{ 'bg-muted': showPreview }"
                  @click="showPreview = !showPreview"
                >
                  <Eye class="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Toggle preview</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <!-- Editor/Preview Split -->
        <div class="flex-1 flex overflow-hidden">
          <div :class="showPreview ? 'w-1/2' : 'w-full'" class="h-full overflow-hidden">
            <EditorWrapper 
              :initial-content="fileContent"
              :mode="editorMode"
              @update:content="updateContent"
            />
          </div>
          <PreviewPanel 
            v-if="showPreview" 
            :content="fileContent"
            class="w-1/2 border-l border-border/50"
          />
        </div>
      </main>
    </div>

    <!-- Modals -->
    <CommandPalette ref="commandPaletteRef" :files="[]" @select="selectFile" />
    <RepoSelector v-model:open="showRepoSelector" @select="handleRepoSelect" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Eye, Code as CodeIcon, ChevronDown } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import EditorWrapper from '@/components/editor/EditorWrapper.vue'
import PreviewPanel from '@/components/preview/PreviewPanel.vue'
import CommandPalette from '@/components/command/CommandPalette.vue'
import RepoSelector from '@/components/github/RepoSelector.vue'
import { useMagicKeys, whenever } from '@vueuse/core'

// State
const currentFile = ref<string | null>(null)
const fileContent = ref('')
const commandPaletteRef = ref()
const showPreview = ref(false)
const showSidebar = ref(true)
const editorMode = ref<'visual' | 'source'>('visual')
const repo = ref<string | undefined>(undefined)
const showRepoSelector = ref(false)

// Keyboard shortcuts
const { Meta_K, Ctrl_K } = useMagicKeys()
whenever(() => Meta_K?.value || Ctrl_K?.value, () => openCommandPalette())

function openCommandPalette() {
  commandPaletteRef.value?.open()
}

async function selectFile(path: string) {
  if (!repo.value) return
  
  const [owner, name] = repo.value.split('/')
  if (!owner || !name) return
  
  try {
    // TODO: Implement file reading from GitHub
    currentFile.value = path
    fileContent.value = `// Loading ${path}...`
    console.log('Selected file:', path)
  } catch (error) {
    console.error('Failed to load file:', error)
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
