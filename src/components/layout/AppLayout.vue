<template>
  <div class="h-screen w-full flex bg-background text-foreground overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-64 border-r flex flex-col bg-muted/10">
      <div class="p-4 border-b flex items-center justify-between">
        <span class="font-bold flex items-center gap-2">
          <FileText class="w-5 h-5" />
          Quarto Editor
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Button variant="ghost" size="icon" @click="openCommandPalette">
                <Keyboard class="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Command Palette (Ctrl+K)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div class="flex-1 overflow-auto p-2">
        <div class="text-xs font-semibold text-muted-foreground mb-2 px-2">EXPLORER</div>
        <FileTree :files="files" @select="selectFile" />
      </div>

      <div class="p-4 border-t">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
            <User class="w-4 h-4 text-slate-500" />
          </div>
          <div class="text-sm">
            <div class="font-medium">Guest User</div>
            <div class="text-xs text-muted-foreground">Not logged in</div>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col h-full min-w-0">
      <header class="h-14 border-b flex items-center justify-between px-4 bg-background">
        <div class="flex items-center gap-2">
           <span class="font-medium">{{ currentFile || 'No file selected' }}</span>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" @click="saveFile">
            <Save class="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button size="sm" @click="commitChanges">
            <GitBranch class="w-4 h-4 mr-2" />
            Commit
          </Button>
        </div>
      </header>
      
      <div class="flex-1 overflow-hidden" v-if="currentFile">
        <EditorWrapper 
          :initial-content="fileContent" 
          @update:content="updateContent" 
        />
      </div>
      <div v-else class="flex-1 flex items-center justify-center text-muted-foreground">
        Select a file to start editing
      </div>
    </main>

    <CommandPalette ref="commandPaletteRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FileText, Keyboard, User, Save, GitBranch } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import EditorWrapper from '@/components/editor/EditorWrapper.vue'
import FileTree from '@/components/file-tree/FileTree.vue'
import CommandPalette from '@/components/command/CommandPalette.vue'
import { fileSystem } from '@/services/storage'
import { githubService } from '@/services/github'
import { useMagicKeys, whenever } from '@vueuse/core'

const files = ref<string[]>([])
const currentFile = ref<string | null>(null)
const fileContent = ref('')
const commandPaletteRef = ref()

const { Meta_K, Ctrl_K } = useMagicKeys()

whenever(() => Meta_K.value || Ctrl_K.value, () => {
  openCommandPalette()
})

function openCommandPalette() {
  commandPaletteRef.value?.open()
}

async function loadFiles() {
  files.value = await fileSystem.listFiles()
}

async function selectFile(filename: string) {
  currentFile.value = filename
  fileContent.value = await fileSystem.readFile(filename)
}

function updateContent(newContent: string) {
  fileContent.value = newContent
}

async function saveFile() {
  if (currentFile.value) {
    await fileSystem.saveFile(currentFile.value, fileContent.value)
    console.log('Saved locally')
  }
}

async function commitChanges() {
  if (currentFile.value) {
    await githubService.commitChanges(
      'mock-owner', 
      'mock-repo', 
      currentFile.value, 
      fileContent.value, 
      'Update from Quarto Editor'
    )
    alert('Changes committed (Mock)')
  }
}

onMounted(() => {
  loadFiles()
})
</script>
