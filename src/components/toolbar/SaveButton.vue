<template>
  <div class="flex items-center gap-2">

    <!-- Provider Save Status -->
    <TooltipProvider :delay-duration="0">
      <Tooltip>
        <TooltipTrigger as-child>
          <div class="relative">
            <Button 
                :variant="isDirtyToProvider ? 'default' : 'ghost'" 
                size="sm" 
                class="h-9 w-9 gap-2 transition-all p-0"
                :class="{ 'shadow-lg shadow-primary/20 bg-primary text-primary-foreground': isDirtyToProvider }"
                :disabled="!canSave" 
                @click="emit('save')"
            >
                <component :is="saveIcon" class="w-4 h-4" />
                <span v-if="isDirtyToProvider && !isCondensed" class="mr-1 ml-1">{{ saveLabel }}</span>
            </Button>
            <!-- Provider Dirty Dot -->
            <div v-if="isDirtyToProvider" class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background animate-pulse" />
            
            <!-- Local Draft Dot (Very subtle) -->
            <div v-if="autoSaveStatus === 'saving'" class="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-400 rounded-full border-2 border-background" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>{{ isDirtyToProvider ? 'Unsaved changes to ' + providerName : 'Changes saved to ' + providerName }} <kbd class="ml-1 px-1 py-0.5 bg-muted rounded text-xs text-muted-foreground">⌘S</kbd></p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
</template>

<script setup lang="ts">
import { Save, Github } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { computed } from 'vue'

const props = defineProps<{
  canSave: boolean
  isDirtyToProvider: boolean
  autoSaveStatus: 'idle' | 'saving' | 'saved'
  providerId: string
  providerName: string
  isCondensed?: boolean
}>()

const emit = defineEmits<{
  save: []
}>()

const saveLabel = computed(() => {
    if (props.providerId === 'github') return 'Commit'
    return 'Save'
})

const saveIcon = computed(() => {
    if (props.providerId === 'github') return Github
    return Save
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
