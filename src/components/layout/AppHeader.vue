<template>
  <header class="h-12 border-b border-border/50 flex items-center px-4 gap-2">
    <!-- Left: Sidebar Toggle & Command Palette -->
    <div class="flex items-center gap-2">
      <SidebarToggle :visible="sidebarVisible" @toggle="emit('toggle-sidebar')" />
      <div class="w-px h-4 bg-border/50 mx-1" />
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
    
    <!-- Spacer -->
    <div class="flex-1" />
    
    <!-- Right: actions & Preview -->
    <div class="flex items-center gap-1">
      <SaveButton :can-save="canSave" @save="emit('save')" />
      <ThemeToggle />
      <div class="w-px h-4 bg-border/50 mx-1" />
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
import { Keyboard, PanelRightOpen } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ThemeToggle, SidebarToggle, SaveButton } from '@/components/toolbar'

defineProps<{
  canSave: boolean
  sidebarVisible: boolean
  showPreview: boolean
}>()

const emit = defineEmits<{
  'command-palette': []
  'save': []
  'toggle-sidebar': []
  'update:showPreview': [show: boolean]
}>()
</script>
