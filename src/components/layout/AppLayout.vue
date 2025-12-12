<template>
  <div class="h-screen w-full flex bg-background text-foreground overflow-hidden">
    <!-- Sidebar -->
    <aside 
      class="border-r flex flex-col bg-secondary/50 border-border transition-all duration-300 ease-out"
      :class="showSidebar ? 'w-60' : 'w-0 border-r-0'"
    >
      <div v-show="showSidebar" class="flex flex-col h-full min-w-60">
        <div class="p-4 border-b border-border/50 space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-semibold flex items-center gap-2.5 text-foreground">
              <div class="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <span class="text-xs font-bold text-primary-foreground">Q</span>
              </div>
              Quartier
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Button variant="ghost" size="icon" class="h-7 w-7" @click="openCommandPalette">
                    <Keyboard class="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Command Palette (⌘K)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            class="w-full justify-between px-2 h-8 text-xs font-normal border-dashed" 
            @click="showRepoSelector = true"
          >
            <div class="flex items-center truncate">
              <BookMarked class="w-3.5 h-3.5 mr-2 opacity-70" />
              <span class="truncate">{{ repo || 'Select Repository...' }}</span>
            </div>
            <ChevronDown class="w-3 h-3 opacity-50 ml-2 flex-shrink-0" />
          </Button>
        </div>
        
        <div class="flex-1 overflow-auto p-3">
          <div class="flex items-center justify-between mb-3 px-2">
            <span class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Files</span>
            <label v-if="repo" class="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              <input type="checkbox" v-model="showAllFiles" class="w-3 h-3 rounded border-muted-foreground/50" />
              All
            </label>
          </div>
          <div v-if="!repo" class="text-sm text-muted-foreground px-2 py-4 text-center">
            No repository selected.
          </div>
          <FileTree 
            v-else
            :files="filteredFiles" 
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
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col h-full min-w-0">
      <!-- Unified Header with Toolbar -->
      <header class="h-12 border-b flex items-center gap-2 px-2 bg-background border-border">
        <!-- Left: Sidebar toggle + File path -->
        <div class="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  class="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors" 
                  @click="showSidebar = !showSidebar"
                >
                  <PanelLeft class="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{{ showSidebar ? 'Hide Sidebar' : 'Show Sidebar' }}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <div class="w-px h-4 bg-border/50"></div>
          
          <span class="text-sm font-medium text-foreground/80 px-2">{{ currentFile || 'No file' }}</span>
        </div>

        <!-- Center: Mode toggle + Formatting Toolbar (when in visual mode) -->
        <div v-if="currentFile" class="flex-1 flex items-center justify-center gap-1">
          <!-- Mode Toggle -->
          <div class="flex items-center bg-muted/50 rounded-md p-0.5">
            <Button 
              variant="ghost" 
              size="sm" 
              class="h-7 px-2.5 text-xs transition-all duration-200"
              :class="{ 'bg-background shadow-sm': editorMode === 'visual' }"
              @click="editorMode = 'visual'"
            >
              <Eye class="w-3.5 h-3.5 mr-1" />
              Visual
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              class="h-7 px-2.5 text-xs transition-all duration-200"
              :class="{ 'bg-background shadow-sm': editorMode === 'source' }"
              @click="editorMode = 'source'"
            >
              <Code class="w-3.5 h-3.5 mr-1" />
              Source
            </Button>
          </div>

          <!-- Formatting Toolbar (Visual mode only) -->
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div v-if="editorMode === 'visual'" class="flex items-center gap-0.5 ml-2">
              <div class="w-px h-4 bg-border/50 mr-1"></div>
              
              <!-- Heading dropdown -->
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" class="h-7 px-2 gap-1">
                    <Heading class="w-3.5 h-3.5" />
                    <ChevronDown class="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem @click="editorRef?.setHeading(1)">
                    <span class="text-lg font-bold">Heading 1</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="editorRef?.setHeading(2)">
                    <span class="text-base font-bold">Heading 2</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="editorRef?.setHeading(3)">
                    <span class="text-sm font-bold">Heading 3</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem @click="editorRef?.setParagraph()">Paragraph</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="icon" class="h-7 w-7" @click="editorRef?.toggleBulletList()">
                <List class="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" class="h-7 w-7" @click="editorRef?.toggleOrderedList()">
                <ListOrdered class="w-3.5 h-3.5" />
              </Button>
              
              <div class="w-px h-4 bg-border/50 mx-1"></div>
              
              <Button variant="ghost" size="icon" class="h-7 w-7" @click="editorRef?.toggleBlockquote()">
                <Quote class="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" class="h-7 w-7" @click="editorRef?.toggleCodeBlock()">
                <CodeIcon class="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" class="h-7 w-7" @click="editorRef?.setLink()">
                <Link class="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" class="h-7 w-7" @click="editorRef?.addImage()">
                <ImageIcon class="w-3.5 h-3.5" />
              </Button>
            </div>
          </Transition>
        </div>
        <div v-else class="flex-1"></div>

        <!-- Right: Actions -->
        <div class="flex items-center gap-1">
          <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors" @click="toggleDark()">
            <Sun v-if="!isDark" class="w-4 h-4" />
            <Moon v-else class="w-4 h-4" />
          </Button>
          
          <div class="w-px h-4 bg-border/50"></div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            class="h-8 px-2 text-muted-foreground hover:text-foreground transition-colors" 
            @click="showPreview = !showPreview" 
            :class="{ 'bg-accent text-accent-foreground': showPreview }"
          >
            <PanelRight class="w-4 h-4 mr-1.5" />
            <span class="text-xs">Preview</span>
          </Button>

          <Button variant="ghost" size="sm" class="h-8 px-2 text-muted-foreground hover:text-foreground transition-colors" @click="saveFile">
            <Save class="w-4 h-4 mr-1.5" />
            <span class="text-xs">Save</span>
          </Button>
          
          <Button size="sm" class="h-8 px-3 transition-colors" @click="commitChanges">
            <GitBranch class="w-3.5 h-3.5 mr-1.5" />
            <span class="text-xs font-medium">Commit</span>
          </Button>
        </div>
      </header>
      
      <!-- Editor Area -->
      <div class="flex-1 flex overflow-hidden">
        <div class="flex-1 overflow-hidden relative">
          <Transition
            enter-active-class="transition-opacity duration-200"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition-opacity duration-150"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
            mode="out-in"
          >
            <div v-if="currentFile" :key="currentFile" class="h-full">
              <EditorWrapper 
                ref="editorRef"
                :initial-content="fileContent"
                :mode="editorMode"
                @update:content="updateContent" 
              />
            </div>
            <div v-else class="h-full flex items-center justify-center text-muted-foreground">
              Select a file to start editing
            </div>
          </Transition>
        </div>

        <!-- Preview Panel with animation -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="w-0 opacity-0"
          enter-to-class="w-[400px] opacity-100"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="w-[400px] opacity-100"
          leave-to-class="w-0 opacity-0"
        >
          <PreviewPanel 
            v-if="showPreview" 
            :repo="repo"
            class="w-[400px] border-l overflow-hidden"
            @render="handleRender"
          />
        </Transition>
      </div>
    </main>

    <CommandPalette ref="commandPaletteRef" />
    <RepoSelector 
      v-model:open="showRepoSelector"
      :current-repo="repo"
      @select="handleRepoSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { 
  Keyboard, Save, GitBranch, PanelRight, PanelLeft, Sun, Moon,
  Eye, Code as CodeIcon, Heading, ChevronDown, List, ListOrdered, 
  Quote, Code, Link, ImageIcon, BookMarked
} from 'lucide-vue-next'
import UserMenu from './UserMenu.vue'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import EditorWrapper from '@/components/editor/EditorWrapper.vue'
import FileTree from '@/components/file-tree/FileTree.vue'
import CommandPalette from '@/components/command/CommandPalette.vue'
import PreviewPanel from '@/components/preview/PreviewPanel.vue'
import RepoSelector from '@/components/github/RepoSelector.vue'
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
const editorRef = ref<InstanceType<typeof EditorWrapper> | null>(null)
const showPreview = ref(false)
const showSidebar = ref(true)
const editorMode = ref<'visual' | 'source'>('visual')
const repo = ref<string | undefined>(undefined)
const showRepoSelector = ref(false)
const showAllFiles = ref(false)

// Quarto-relevant file extensions (whitelist)
const QUARTO_EXTENSIONS = new Set([
  '.qmd', '.md', '.rmd', '.ipynb',  // Document files
  '.yml', '.yaml',                   // Config files
  '.bib', '.csl',                    // Bibliography
  '.r', '.py', '.jl',                // Code files
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',  // Images
  '.pdf', '.html',                   // Outputs (for reference)
  '.css', '.scss', '.lua',           // Styling/filters
])

const filteredFiles = computed(() => {
  if (showAllFiles.value) return files.value
  return files.value.filter(f => {
    // Always hide hidden files/folders unless showAllFiles
    const parts = f.split('/')
    if (parts.some(part => part.startsWith('.'))) return false
    
    // Check extension whitelist
    const ext = '.' + f.split('.').pop()?.toLowerCase()
    return QUARTO_EXTENSIONS.has(ext)
  })
})

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
  if (!repo.value) return
  const [owner, name] = repo.value.split('/')
  if (owner && name) {
    await githubService.triggerWorkflow(owner, name)
  }
}

async function commitChanges() {
  if (currentFile.value && repo.value) {
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

async function handleRepoSelect(selectedRepo: { owner: string, name: string, full_name: string }) {
  repo.value = selectedRepo.full_name
  console.log('Selected repo:', selectedRepo.full_name)
  
  try {
    const contents = await githubService.loadRepo(selectedRepo.owner, selectedRepo.name)
    // Transform GitHub API response to file paths
    const filePaths = contents.map((item: { path: string }) => item.path)
    files.value = filePaths
    currentFile.value = null
    fileContent.value = ''
  } catch (error) {
    console.error('Failed to load repo contents:', error)
    alert('Failed to load repository contents')
  }
}

onMounted(() => {
  // Files are now loaded when a repo is selected
})
</script>
