<template>
  <img 
    v-if="iconUrl" 
    :src="iconUrl" 
    :alt="name" 
    class="w-4 h-4 shrink-0"
    :class="{ 'opacity-50 grayscale': monochrome }"
  />
  <component 
    v-else 
    :is="fallbackIcon" 
    class="w-4 h-4 shrink-0 text-muted-foreground" 
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getIconForFile, getIconForFolder, getIconForOpenFolder } from 'vscode-icons-js'
import { File, Folder, FolderOpen } from 'lucide-vue-next'

const props = defineProps<{
  name: string
  type: 'file' | 'folder'
  isOpen?: boolean
  monochrome?: boolean
}>()

// CDN URL for vscode-icons SVGs
const ICON_CDN = 'https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons/icons'

const iconUrl = computed(() => {
  let iconName: string | undefined
  
  if (props.type === 'folder') {
    iconName = props.isOpen 
      ? getIconForOpenFolder(props.name) 
      : getIconForFolder(props.name)
  } else {
    iconName = getIconForFile(props.name)
  }
  
  return iconName ? `${ICON_CDN}/${iconName}` : undefined
})

const fallbackIcon = computed(() => {
  if (props.type === 'folder') {
    return props.isOpen ? FolderOpen : Folder
  }
  return File
})
</script>

<style scoped>
img {
  /* Apply monochrome filter using CSS for consistent look */
  filter: var(--icon-filter, none);
}

.monochrome {
  --icon-filter: grayscale(100%) brightness(0.8);
}
</style>
