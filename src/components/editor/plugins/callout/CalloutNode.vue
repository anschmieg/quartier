<template>
  <div 
    class="callout" 
    :class="[`callout-${calloutType}`, { 'callout-collapsed': isCollapsed }]"
    contenteditable="false"
  >
    <!-- Header -->
    <div 
      class="callout-header flex items-center gap-2 cursor-pointer select-none"
      @click="toggleCollapse"
    >
      <!-- Icon -->
      <component :is="iconComponent" class="h-5 w-5 shrink-0" :class="iconClass" />
      
      <!-- Title -->
      <span class="font-semibold text-sm flex-1">
        {{ displayTitle }}
      </span>
      
      <!-- Collapse indicator -->
      <ChevronDown 
        v-if="isCollapsible"
        class="h-4 w-4 transition-transform shrink-0" 
        :class="{ 'rotate-180': !isCollapsed }"
      />
    </div>
    
    <!-- Content -->
    <div 
      v-show="!isCollapsed"
      class="callout-content mt-2"
      :ref="contentRef"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useNodeViewContext } from '@prosemirror-adapter/vue'
import { 
  Info, 
  AlertTriangle, 
  AlertCircle, 
  Lightbulb, 
  ShieldAlert,
  ChevronDown 
} from 'lucide-vue-next'
import type { CalloutType } from './index'

const { node, contentRef } = useNodeViewContext()

const calloutType = computed<CalloutType>(() => node.value.attrs?.type || 'note')
const title = computed(() => node.value.attrs?.title || '')
const collapse = computed(() => node.value.attrs?.collapse || 'false')

const isCollapsible = computed(() => collapse.value !== 'false')
const isCollapsed = ref(collapse.value === 'true')

const displayTitle = computed(() => {
  if (title.value) return title.value
  // Default titles based on type
  const defaults: Record<CalloutType, string> = {
    note: 'Note',
    warning: 'Warning',
    important: 'Important',
    tip: 'Tip',
    caution: 'Caution',
  }
  return defaults[calloutType.value] || 'Note'
})

const iconComponent = computed(() => {
  const icons: Record<CalloutType, any> = {
    note: Info,
    warning: AlertTriangle,
    important: AlertCircle,
    tip: Lightbulb,
    caution: ShieldAlert,
  }
  return icons[calloutType.value] || Info
})

const iconClass = computed(() => {
  const classes: Record<CalloutType, string> = {
    note: 'text-blue-500',
    warning: 'text-yellow-500',
    important: 'text-red-500',
    tip: 'text-green-500',
    caution: 'text-orange-500',
  }
  return classes[calloutType.value] || 'text-blue-500'
})

function toggleCollapse() {
  if (isCollapsible.value) {
    isCollapsed.value = !isCollapsed.value
  }
}
</script>

<style scoped>
.callout {
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  margin: 1rem 0;
  border-left: 4px solid;
}

.callout-note {
  background-color: hsl(210 100% 97%);
  border-left-color: hsl(210 100% 50%);
}

.callout-warning {
  background-color: hsl(45 100% 96%);
  border-left-color: hsl(45 100% 50%);
}

.callout-important {
  background-color: hsl(0 100% 97%);
  border-left-color: hsl(0 100% 50%);
}

.callout-tip {
  background-color: hsl(142 100% 97%);
  border-left-color: hsl(142 100% 40%);
}

.callout-caution {
  background-color: hsl(30 100% 96%);
  border-left-color: hsl(30 100% 50%);
}

:global(.dark) .callout-note {
  background-color: hsl(210 50% 15%);
}

:global(.dark) .callout-warning {
  background-color: hsl(45 50% 15%);
}

:global(.dark) .callout-important {
  background-color: hsl(0 50% 15%);
}

:global(.dark) .callout-tip {
  background-color: hsl(142 50% 15%);
}

:global(.dark) .callout-caution {
  background-color: hsl(30 50% 15%);
}

.callout-content {
  font-size: 0.875rem;
}

.callout-collapsed .callout-content {
  display: none;
}
</style>
