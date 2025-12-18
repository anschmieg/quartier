<template>
  <aside 
    class="flex flex-col bg-background/50 border-l border-border/50 shrink-0 h-full overflow-hidden transition-all duration-150 ease-out"
    :class="visible ? 'w-96' : 'w-0 border-l-0'"
  >
    <div class="w-96 flex flex-col h-full">
      <!-- Top Action Bar (Aligned with Header) -->
      <div class="h-12 border-b border-border/50 flex items-center px-4 justify-between gap-2 shrink-0 bg-background/30 backdrop-blur-sm">
        <!-- Left: Preview Actions -->
        <div class="flex items-center gap-1.5 overflow-hidden">
          <div class="flex items-center gap-1">
            <Button 
                size="sm" 
                variant="outline" 
                class="h-8 px-2 text-xs gap-1.5"
                :disabled="previewRef?.isBuilding || !repo"
                @click="previewRef?.triggerRender"
            >
                <Play class="w-3 h-3" />
                Preview
            </Button>

            <Button 
                size="icon" 
                variant="ghost" 
                class="h-8 w-8"
                :disabled="!previewRef?.previewUrl"
                @click="previewRef?.openPreview"
            >
                <ExternalLink class="w-3.5 h-3.5" />
            </Button>
          </div>

          <!-- Build status -->
          <div v-if="previewRef?.isBuilding" class="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-medium animate-pulse ml-1">
            <Loader2 class="w-3 h-3 animate-spin" />
            <span class="truncate max-w-[60px]">{{ previewRef.stepLabel }}</span>
          </div>
        </div>

        <!-- Middle: Theme Toggle -->
        <div class="flex-1 flex justify-center">
            <ThemeToggle />
        </div>

        <!-- Right: Git/Share Actions -->
        <div class="flex items-center gap-1">
          <ConnectionStatus
            :status="connectionStatus"
            :show-text="false"
            :show-always="true"
            class="mr-1"
          />
          <SaveButton 
            :can-save="canSave" 
            :auto-save-status="autoSaveStatus" 
            :is-dirty-to-provider="isDirtyToProvider"
            :provider-id="providerId"
            :provider-name="providerName"
            is-condensed
            @save="emit('save')" 
          />
          <TooltipProvider :delay-duration="0">
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    class="h-9 w-9"
                    :disabled="!canShare"
                    @click="emit('share')"
                  >
                    <Share2 class="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Share Session</p>
                </TooltipContent>
              </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <!-- Preview Content -->
      <div class="flex-1 overflow-auto relative">
        <PreviewPanel 
            ref="previewRef"
            :repo="repo"
            :content="fileContent"
            hide-header
            class="h-full border-0"
        />
        
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { Share2, Play, ExternalLink, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ConnectionStatus } from '@/components/ui/connection-status'
import { ThemeToggle, SaveButton } from '@/components/toolbar'
import PreviewPanel from '@/components/preview/PreviewPanel.vue'
import { ref } from 'vue'

const previewRef = ref<InstanceType<typeof PreviewPanel> | null>(null)

defineProps<{
  visible: boolean
  canSave: boolean
  canShare: boolean
  autoSaveStatus: 'idle' | 'saving' | 'saved'
  isDirtyToProvider: boolean
  providerId: string
  providerName: string
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  fileContent: string
  repo?: string
}>()

const emit = defineEmits<{
  'save': []
  'share': []
  'close': []
}>()
</script>
