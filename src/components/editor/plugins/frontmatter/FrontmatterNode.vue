<template>
  <div class="frontmatter-container my-4 rounded-md border border-border bg-card text-card-foreground shadow-xs">
    <div 
      contenteditable="false" 
      class="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border select-none"
    >
      <div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <DatabaseIcon class="h-4 w-4" />
        <span>YAML Frontmatter</span>
      </div>
      <button 
        @click="toggle"
        class="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {{ isExpanded ? 'Collapse' : 'Expand' }}
      </button>
    </div>
    
    <div v-show="isExpanded" class="relative group">
      <div 
        :ref="contentRef"
        class="language-yaml font-mono text-sm p-3 bg-card min-h-16 outline-hidden"
      ></div>
    </div>
    
    <div v-show="!isExpanded" class="p-3 text-sm text-muted-foreground italic bg-muted/20">
      {{ previewText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { DatabaseIcon } from 'lucide-vue-next'
import yaml from 'js-yaml'
import { useNodeViewContext } from '@prosemirror-adapter/vue'

const { node, contentRef } = useNodeViewContext()

const isExpanded = ref(true)

const toggle = () => {
  isExpanded.value = !isExpanded.value
}

// Try to parse the node content to show a preview if collapsed
// Note: This relies on the node text content directly
const previewText = computed(() => {
  try {
    const text = node.value.textContent
    const parsed = yaml.load(text)
    if (typeof parsed === 'object' && parsed !== null) {
      const keys = Object.keys(parsed)
      if (keys.length === 0) return 'Empty frontmatter'
      return `${keys.length} keys: ${keys.join(', ')}`
    }
    return 'Invalid YAML'
  } catch (e) {
    return 'Invalid YAML'
  }
})
</script>

<style scoped>
.frontmatter-container {
  /* Ensure it doesn't break the prose flow too much */
  break-inside: avoid;
}
</style>
