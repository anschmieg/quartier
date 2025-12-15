
<script setup lang="ts">
import { computed } from 'vue'
import type { CompletionState } from './completion-plugin'

const props = defineProps<{
    state: CompletionState
}>()

const style = computed(() => {
    if (!props.state.coords) return { display: 'none' }
    return {
        top: `${props.state.coords.bottom + 5}px`,
        left: `${props.state.coords.left}px`,
        position: 'fixed' as const
    }
})
</script>

<template>
  <div v-show="state.active && state.items.length > 0" 
       class="z-50 min-w-[200px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
       :style="style">
    <div v-for="(item, i) in state.items" 
         :key="item.label"
         class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors"
         :class="{ 'bg-accent text-accent-foreground': i === state.index }">
      
      <div class="flex flex-col">
          <span class="font-medium">{{ item.label }}</span>
          <span v-if="item.detail" class="text-xs text-muted-foreground">{{ item.detail }}</span>
      </div>
      
      <span class="ml-auto text-xs opacity-50">{{ item.kind }}</span>
    </div>
  </div>
</template>
