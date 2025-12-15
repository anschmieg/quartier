<template>
  <div class="flex items-center gap-2">
    <!-- Auto-save indicator -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <span v-if="autoSaveStatus !== 'idle'" class="text-xs text-muted-foreground flex items-center gap-1">
        <Loader2 v-if="autoSaveStatus === 'saving'" class="w-3 h-3 animate-spin" />
        <Check v-else-if="autoSaveStatus === 'saved'" class="w-3 h-3" />
        <span>{{ autoSaveStatus === 'saving' ? 'Auto-saving...' : 'Auto-saved' }}</span>
      </span>
    </Transition>
    
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button variant="ghost" size="icon" :disabled="!canSave" @click="emit('save')">
            <Save class="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Save <kbd class="ml-1 px-1 py-0.5 bg-muted rounded text-xs">⌘S</kbd></p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
</template>

<script setup lang="ts">
import { Save, Loader2, Check } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

defineProps<{
  canSave: boolean
  autoSaveStatus?: 'idle' | 'saving' | 'saved'
}>()

const emit = defineEmits<{
  save: []
}>()
</script>
