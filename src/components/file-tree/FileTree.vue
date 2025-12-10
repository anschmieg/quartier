<template>
  <div class="space-y-1">
    <div 
      v-for="file in files" 
      :key="file"
      class="flex items-center gap-2 px-2 py-1 text-sm rounded cursor-pointer hover:bg-muted"
      @click="$emit('select', file)"
    >
      <File class="w-4 h-4 text-muted-foreground" />
      {{ file }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { File } from 'lucide-vue-next'

defineProps<{
  files: string[]
}>()

defineEmits(['select'])
</script>
