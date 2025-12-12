<template>
  <header class="h-12 border-b border-border/50 flex items-center px-4 gap-2">
    <!-- Left: Logo and keyboard shortcut -->
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
    
    <!-- Center: spacer -->
    <div class="flex-1" />
    
    <!-- Right: actions -->
    <div class="flex items-center gap-1">
      <SaveButton :can-save="canSave" @save="emit('save')" />
      <ThemeToggle />
      <SidebarToggle :visible="sidebarVisible" @toggle="emit('toggle-sidebar')" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { Keyboard } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ThemeToggle, SidebarToggle, SaveButton } from '@/components/toolbar'

defineProps<{
  canSave: boolean
  sidebarVisible: boolean
}>()

const emit = defineEmits<{
  'command-palette': []
  'save': []
  'toggle-sidebar': []
}>()
</script>
