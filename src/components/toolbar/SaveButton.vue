<template>
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
</template>

<script setup lang="ts">
import { Save } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

defineProps<{
  canSave: boolean
}>()

const emit = defineEmits<{
  save: []
}>()
</script>
