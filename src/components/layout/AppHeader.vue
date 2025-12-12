<template>
  <header class="h-12 border-b border-border/50 flex items-center px-4 gap-2">
    <!-- Left: Sidebar Toggle & Command Palette -->
    <div class="flex items-center gap-2">
      <SidebarToggle :visible="sidebarVisible" @toggle="emit('toggle-sidebar')" />
      <div class="w-px h-4 bg-border/50 mx-1" />
      <TooltipProvider :delay-duration="0">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="icon" @click="emit('command-palette')">
              <Keyboard class="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Command Palette <kbd class="ml-1 px-1 py-0.5 bg-muted rounded text-xs">⌘K</kbd></p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
    
    <!-- Center: Editor Mode Toggle (aligned with editor area) -->
    <div 
      class="flex items-center gap-0.5 p-0.5 bg-muted/50 rounded-lg transition-all duration-150"
      :style="{ marginLeft: sidebarVisible ? 'calc((256px - 1rem) - (4rem + 2.5rem))' : '0' }"
    >
      <TooltipProvider :delay-duration="0">
        <Tooltip>
          <TooltipTrigger as-child>
            <button 
              @click="emit('update:editorMode', 'visual')"
              class="p-1.5 rounded-md transition-all"
              :class="editorMode === 'visual' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'"
            >
              <Eye class="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Visual Mode</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider :delay-duration="0">
        <Tooltip>
          <TooltipTrigger as-child>
            <button 
              @click="emit('update:editorMode', 'source')"
              class="p-1.5 rounded-md transition-all"
              :class="editorMode === 'source'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'"
            >
              <Code class="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Source Mode</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
    
    <!-- Editor Toolbar (only in visual mode) -->
    <EditorToolbar 
      v-if="editorMode === 'visual' && editorInstance" 
      :editor="editorInstance"
      class="flex-1"
    />
    
    <!-- Spacer -->
    <div class="flex-1" />
    
    <!-- Right: actions & Preview -->
    <div class="flex items-center gap-1">
      <SaveButton :can-save="canSave" @save="emit('save')" />
      <ThemeToggle />
      <div class="w-px h-4 bg-border/50 mx-1" />
      <!-- Preview toggle -->
      <TooltipProvider :delay-duration="0">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button 
              variant="ghost" 
              size="icon"
              :class="{ 'bg-muted': showPreview }"
              @click="emit('update:showPreview', !showPreview)"
            >
              <PanelRightOpen class="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{{ showPreview ? 'Hide' : 'Show' }} Preview</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { Eye, Code, Keyboard, PanelRightOpen } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ThemeToggle, SidebarToggle, SaveButton } from '@/components/toolbar'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'

defineProps<{
  canSave: boolean
  sidebarVisible: boolean
  showPreview: boolean
  editorMode: 'visual' | 'source'
  editorInstance?: Editor
}>()

const emit = defineEmits<{
  'command-palette': []
  'save': []
  'toggle-sidebar': []
  'update:showPreview': [show: boolean]
  'update:editorMode': [mode: 'visual' | 'source']
}>()
</script>
