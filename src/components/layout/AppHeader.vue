<template>
  <header class="h-12 border-b border-border/50 flex items-center px-4 gap-2">
    <!-- Left: Command palette -->
    <div class="flex items-center gap-2">
      <TooltipProvider>
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
    
    <!-- Center: Editor mode toggle -->
    <div class="flex items-center gap-2 ml-4">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="sm" class="gap-1 h-7">
            <component :is="editorMode === 'visual' ? Eye : CodeIcon" class="w-3.5 h-3.5" />
            {{ editorMode === 'visual' ? 'Visual' : 'Source' }}
            <ChevronDown class="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem @select="emit('update:editorMode', 'visual')">
            <Eye class="w-4 h-4 mr-2" /> Visual Editor
          </DropdownMenuItem>
          <DropdownMenuItem @select="emit('update:editorMode', 'source')">
            <CodeIcon class="w-4 h-4 mr-2" /> Source Mode
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    
    <!-- Spacer -->
    <div class="flex-1" />
    
    <!-- Right: actions -->
    <div class="flex items-center gap-1">
      <!-- Preview toggle -->
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button 
              variant="ghost" 
              size="icon"
              :class="{ 'bg-muted': showPreview }"
              @click="emit('update:showPreview', !showPreview)"
            >
              <SplitSquareVertical class="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{{ showPreview ? 'Hide' : 'Show' }} Preview</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <SaveButton :can-save="canSave" @save="emit('save')" />
      <ThemeToggle />
      <SidebarToggle :visible="sidebarVisible" @toggle="emit('toggle-sidebar')" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { Keyboard, Eye, Code as CodeIcon, ChevronDown, SplitSquareVertical } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle, SidebarToggle, SaveButton } from '@/components/toolbar'

defineProps<{
  canSave: boolean
  sidebarVisible: boolean
  editorMode: 'visual' | 'source'
  showPreview: boolean
}>()

const emit = defineEmits<{
  'command-palette': []
  'save': []
  'toggle-sidebar': []
  'update:editorMode': [mode: 'visual' | 'source']
  'update:showPreview': [show: boolean]
}>()
</script>
