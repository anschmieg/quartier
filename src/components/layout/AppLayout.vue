<template>
  <div class="h-screen w-full flex bg-background text-foreground overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-60 border-r flex flex-col bg-secondary/50 border-border">
      <div class="p-5 border-b border-border/50 flex items-center justify-between">
        <span class="font-semibold flex items-center gap-2.5 text-foreground">
          <div class="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <span class="text-xs font-bold text-primary-foreground">Q</span>
          </div>
          Quartier
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
      
      <div class="flex-1 overflow-auto p-3">
        <div class="text-[11px] font-medium text-muted-foreground mb-3 px-2 uppercase tracking-wider">Files</div>
        <FileTree 
          :files="files" 
          :selected-path="currentFile"
          @select="selectFile" 
          @create-file="handleCreateFile"
          @create-folder="handleCreateFolder"
          @rename="handleRename"
          @delete="handleDelete"
        />
      </div>

      <div class="p-4 border-t border-border/50">
        <UserMenu />
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col h-full min-w-0">
      <header class="h-14 border-b flex items-center justify-between px-4 bg-background border-border">
        <div class="flex items-center gap-2">
           <span class="text-sm font-medium text-foreground/90">{{ currentFile || 'No file selected' }}</span>
        </div>
        <div class="flex items-center gap-1">
          <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors" @click="toggleDark()">
             <Sun v-if="!isDark" class="w-4 h-4" />
             <Moon v-else class="w-4 h-4" />
          </Button>
          
          <div class="w-px h-4 bg-border mx-2"></div>
          
          <Button variant="ghost" size="sm" class="h-8 px-2 text-muted-foreground hover:text-foreground transition-colors" @click="showPreview = !showPreview" :class="{ 'bg-accent text-accent-foreground': showPreview }">
            <PanelRight class="w-4 h-4 mr-2" />
            <span class="text-xs">Preview</span>
          </Button>

          <Button variant="ghost" size="sm" class="h-8 px-2 text-muted-foreground hover:text-foreground transition-colors" @click="saveFile">
            <Save class="w-4 h-4 mr-2" />
            <span class="text-xs">Save</span>
          </Button>
          
          <Button size="sm" class="h-8 px-3 ml-1 transition-colors" @click="commitChanges">
            <GitBranch class="w-3.5 h-3.5 mr-1.5" />
            <span class="text-xs font-medium">Commit</span>
          </Button>
        </div>
      </header>
      
      <div class="flex-1 flex overflow-hidden">
        <div class="flex-1 overflow-hidden relative">
          <div v-if="currentFile" class="h-full">
            <EditorWrapper 
              :initial-content="fileContent" 
              @update:content="updateContent" 
            />
          </div>
          <div v-else class="h-full flex items-center justify-center text-muted-foreground">
            Select a file to start editing
          </div>
        </div>

        <PreviewPanel 
          v-if="showPreview" 
          :repo="repo"
          class="w-[400px] border-l"
          @render="handleRender"
        />
      </div>
    </main>

    <CommandPalette ref="commandPaletteRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FileText, Keyboard, Save, GitBranch, PanelRight, Sun, Moon } from 'lucide-vue-next'
import UserMenu from './UserMenu.vue'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import EditorWrapper from '@/components/editor/EditorWrapper.vue'
import FileTree from '@/components/file-tree/FileTree.vue'
import CommandPalette from '@/components/command/CommandPalette.vue'
import PreviewPanel from '@/components/preview/PreviewPanel.vue'
import { fileSystem } from '@/services/storage'
import { githubService } from '@/services/github'
import { useMagicKeys, whenever, useDark, useToggle } from '@vueuse/core'

const isDark = useDark({
  selector: 'html',
  attribute: 'class',
  valueDark: 'dark',
  valueLight: 'light',
})
const toggleDark = useToggle(isDark)

const files = ref<string[]>([])
const currentFile = ref<string | null>(null)
const fileContent = ref('')
const commandPaletteRef = ref()
const showPreview = ref(false)
const repo = ref('mock-owner/mock-repo')

const { Meta_K, Ctrl_K } = useMagicKeys()

whenever(() => Meta_K?.value || Ctrl_K?.value, () => {
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

async function handleRender() {
  const [owner, name] = repo.value.split('/')
  if (owner && name) {
    await githubService.triggerWorkflow(owner, name)
  }
}

async function commitChanges() {
  if (currentFile.value) {
    const [owner, name] = repo.value.split('/')
    await githubService.commitChanges(
      owner || 'mock-owner', 
      name || 'mock-repo', 
      currentFile.value, 
      fileContent.value, 
      'Update from Quartier'
    )
    alert('Changes committed (Mock)')
  }
}

async function handleCreateFile(parentPath: string) {
  const name = window.prompt('Enter file name:')
  if (name) {
    const path = parentPath ? `${parentPath}/${name}` : name
    await fileSystem.saveFile(path, '')
    await loadFiles()
    selectFile(path)
  }
}

async function handleCreateFolder(parentPath: string) {
  const name = window.prompt('Enter folder name:')
  if (name) {
    // Create a placeholder file to represent the folder
    const path = parentPath ? `${parentPath}/${name}/.gitkeep` : `${name}/.gitkeep`
    await fileSystem.saveFile(path, '')
    await loadFiles()
  }
}

async function handleRename(path: string) {
  const oldName = path.split('/').pop()
  const newName = window.prompt('Enter new name:', oldName)
  if (newName && newName !== oldName) {
    const parentPath = path.split('/').slice(0, -1).join('/')
    const newPath = parentPath ? `${parentPath}/${newName}` : newName
    const content = await fileSystem.readFile(path)
    await fileSystem.saveFile(newPath, content)
    // Note: In a real app, we'd delete the old file
    await loadFiles()
    if (currentFile.value === path) {
      selectFile(newPath)
    }
  }
}

async function handleDelete(path: string) {
  if (window.confirm(`Delete "${path}"?`)) {
    await fileSystem.deleteFile(path)
    await loadFiles()
    if (currentFile.value === path) {
      currentFile.value = null
      fileContent.value = ''
    }
  }
}

onMounted(() => {
  loadFiles()
})
</script>
