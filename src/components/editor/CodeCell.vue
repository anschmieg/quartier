<template>
  <div 
    class="code-cell border border-border rounded-lg overflow-hidden my-4 bg-card"
    :class="{ 'ring-2 ring-primary': isSelected }"
  >
    <!-- Toolbar -->
    <div class="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border" contenteditable="false">
      <div class="flex items-center gap-2">
        <!-- Language Badge -->
        <span 
          class="px-2 py-0.5 text-xs font-medium rounded"
          :class="languageClass"
        >
          {{ displayLanguage }}
        </span>
        
        <!-- Status Indicator -->
        <span 
          v-if="kernelStatus !== 'idle' && kernelStatus !== 'ready'"
          class="flex items-center gap-1 text-xs text-muted-foreground"
        >
          <Loader2 v-if="kernelStatus === 'loading' || kernelStatus === 'busy'" class="h-3 w-3 animate-spin" />
          <AlertCircle v-if="kernelStatus === 'error'" class="h-3 w-3 text-destructive" />
          <span>{{ statusText }}</span>
        </span>
      </div>

      <div class="flex items-center gap-1" contenteditable="false">
        <!-- Run Button -->
        <button
          @click.stop="runCell"
          :disabled="kernelStatus === 'busy' || kernelStatus === 'loading'"
          class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          :class="kernelStatus === 'busy' ? 'text-muted-foreground' : 'text-primary'"
        >
          <Play v-if="kernelStatus !== 'busy'" class="h-3 w-3" />
          <Square v-else class="h-3 w-3" />
          {{ kernelStatus === 'busy' ? 'Stop' : 'Run' }}
        </button>
      </div>
    </div>

    <!-- Code Content (ProseMirror editable) -->
    <div 
      :ref="contentRef"
      class="p-3 font-mono text-sm bg-card min-h-12 focus:outline-hidden"
    />

    <!-- Output Section (Accordion) -->
    <div v-if="hasOutput" class="border-t border-border" contenteditable="false">
      <button
        @click.stop="outputExpanded = !outputExpanded"
        class="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
      >
        <span class="flex items-center gap-2">
          <Terminal class="h-4 w-4 text-muted-foreground" />
          <span class="font-medium">Output</span>
          <span v-if="lastExecution" class="text-xs text-muted-foreground">
            ({{ lastExecution.executionTime }}ms)
          </span>
        </span>
        <ChevronDown 
          class="h-4 w-4 text-muted-foreground transition-transform" 
          :class="{ 'rotate-180': outputExpanded }"
        />
      </button>

      <div v-show="outputExpanded" class="px-3 pb-3">
        <!-- Error -->
        <div v-if="lastExecution?.error" class="p-2 rounded bg-destructive/10 text-destructive text-sm font-mono whitespace-pre-wrap">
          {{ lastExecution.error }}
        </div>

        <!-- Stdout -->
        <div v-if="lastExecution?.stdout" class="p-2 rounded bg-muted text-sm font-mono whitespace-pre-wrap">
          {{ lastExecution.stdout }}
        </div>

        <!-- Result -->
        <div v-if="lastExecution?.result" class="p-2 rounded bg-muted text-sm font-mono whitespace-pre-wrap mt-2">
          <span class="text-muted-foreground">Out: </span>{{ lastExecution.result }}
        </div>

        <!-- R Output -->
        <div v-if="lastExecution?.output?.length" class="p-2 rounded bg-muted text-sm font-mono whitespace-pre-wrap">
          <div v-for="(line, i) in lastExecution.output" :key="i">{{ line }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Play, Square, Loader2, AlertCircle, Terminal, ChevronDown } from 'lucide-vue-next'
import { useNodeViewContext } from '@prosemirror-adapter/vue'
import { useKernel, type ExecutionResult, type KernelStatus } from '@/services/kernel'

// Get node context from ProseMirror adapter
const { node, contentRef, selected } = useNodeViewContext()

const outputExpanded = ref(true)
const lastExecution = ref<ExecutionResult | null>(null)

// Extract language from node attrs
const language = computed(() => {
  const lang = node.value.attrs?.language || ''
  // Normalize: remove curly braces, lowercase
  const cleaned = lang.replace(/[{}]/g, '').toLowerCase().trim()
  return cleaned === 'r' ? 'r' : 'python'
})

const displayLanguage = computed(() => {
  return language.value === 'python' ? 'Python' : 'R'
})

const isSelected = computed(() => selected.value)

// Get kernel for this language
const kernel = computed(() => useKernel(language.value as 'python' | 'r'))
const kernelStatus = computed<KernelStatus>(() => kernel.value.status.value)

const statusText = computed(() => {
  switch (kernelStatus.value) {
    case 'loading': return 'Loading kernel...'
    case 'busy': return 'Running...'
    case 'error': return kernel.value.error.value || 'Error'
    case 'dead': return 'Kernel dead'
    default: return ''
  }
})

const languageClass = computed(() => {
  return language.value === 'python'
    ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
    : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
})

const hasOutput = computed(() => {
  return lastExecution.value !== null
})

async function runCell() {
  if (kernelStatus.value === 'busy') {
    await kernel.value.interrupt()
    return
  }

  try {
    // Get code from the node's text content
    const code = node.value.textContent
    const result = await kernel.value.execute(code)
    lastExecution.value = result
    outputExpanded.value = true
  } catch (error: any) {
    lastExecution.value = {
      success: false,
      error: error.message,
      executionTime: 0,
    }
    outputExpanded.value = true
  }
}
</script>
