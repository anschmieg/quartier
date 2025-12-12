<template>
  <div class="flex items-center gap-1.5">
    <label class="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
      <input 
        type="checkbox" 
        :checked="showAll"
        @change="emit('update:showAll', ($event.target as HTMLInputElement).checked)" 
        class="w-3 h-3 rounded border-muted-foreground/50" 
      />
      All
    </label>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  showAll: boolean
}>()

const emit = defineEmits<{
  'update:showAll': [value: boolean]
}>()
</script>
