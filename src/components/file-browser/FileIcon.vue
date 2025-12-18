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

// Custom mappings for files to ensure consistent icons across all providers
const CUSTOM_MAP: Record<string, string> = {
    // Quarto / Markdown
    'qmd': 'file_type_markdown.svg',
    'rmd': 'file_type_markdown.svg',
    'md': 'file_type_markdown.svg',
    
    // Notebooks & Languages
    'ipynb': 'file_type_jupyter.svg',
    'r': 'file_type_r.svg',
    'py': 'file_type_python.svg',
    'jl': 'file_type_julia.svg',
    'lua': 'file_type_lua.svg',
    
    // Web / Styles
    'html': 'file_type_html.svg',
    'css': 'file_type_css.svg',
    'scss': 'file_type_scss.svg',
    
    // Config / Data
    'yml': 'file_type_yaml.svg',
    'yaml': 'file_type_yaml.svg',
    'bib': 'file_type_tex.svg',
    'csl': 'file_type_xml.svg',
    'pdf': 'file_type_pdf.svg',
    
    // Images
    'png': 'file_type_image.svg',
    'jpg': 'file_type_image.svg',
    'jpeg': 'file_type_image.svg',
    'gif': 'file_type_image.svg',
    'svg': 'file_type_svg.svg',
    'webp': 'file_type_image.svg'
}

const iconUrl = computed(() => {
  if (props.type === 'file') {
      const ext = props.name.split('.').pop()?.toLowerCase()
      if (ext && CUSTOM_MAP[ext]) {
          return `${ICON_CDN}/${CUSTOM_MAP[ext]}`
      }
  }

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
