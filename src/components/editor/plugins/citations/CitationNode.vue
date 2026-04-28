<template>
  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 text-xs font-medium rounded border cursor-pointer select-none transition-colors border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
    <span class="text-blue-400 opacity-70 font-mono">@</span>
    <span>{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { bibtexService } from '@/services/citations/bibtex'

const props = defineProps<{
  node: any
}>()

// Retrieve citation items from node attrs
const items = computed(() => props.node.attrs.items || [])

const firstId = computed(() => items.value[0]?.key || items.value[0]?.id)

// Find resolved item
const resolvedItem = computed(() => {
    if (!firstId.value) return null
    return bibtexService.getItem(firstId.value)
})

// Format label (Author Year) or fallback to ID
const label = computed(() => {
    const item = resolvedItem.value
    if (!item) return firstId.value || 'citation'
    
    const author = item.author?.[0]?.family || 'Unknown'
    const year = item.issued?.['date-parts']?.[0]?.[0] || 'n.d.'
    const suffix = items.value.length > 1 ? ' et al.' : ''
    
    return `${author}, ${year}${suffix}`
})
</script>
