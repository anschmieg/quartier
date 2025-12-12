<template>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger as-child>
        <Button variant="ghost" size="icon" @click="emit('toggle')">
          <PanelLeft v-if="visible" class="w-4 h-4" />
          <PanelRight v-else class="w-4 h-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{{ visible ? 'Hide sidebar' : 'Show sidebar' }}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { PanelLeft, PanelRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()
</script>
