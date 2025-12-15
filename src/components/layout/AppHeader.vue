<template>
  <header class="h-12 border-b border-border/50 flex items-center px-4 gap-2">
    <!-- Left: Sidebar Toggle & Command Palette -->
    <div class="flex items-center gap-2">
      <SidebarToggle :visible="sidebarVisible" @toggle="emit('toggle-sidebar')" />
      <div class="w-px h-4 bg-border/50 mx-1" />
      <TooltipProvider :delay-duration="0">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="icon" @click="emit('command-palette')">
              <Keyboard class="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Command Palette <kbd class="ml-1 px-1 py-0.5 bg-muted rounded text-xs">⌘K</kbd></p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
    
    <!-- Center: Editor Mode Toggle (aligned with editor area) -->
    <div 
      class="flex items-center gap-0.5 p-0.5 bg-muted/50 rounded-lg transition-all duration-150"
      :style="{ marginLeft: sidebarVisible ? 'calc((256px - 1rem) - (4rem + 2.5rem))' : '0' }"
    >
      <TooltipProvider :delay-duration="0">
        <Tooltip>
          <TooltipTrigger as-child>
            <button 
              @click="emit('update:editorMode', 'visual')"
              class="p-1.5 rounded-md transition-all"
              :class="editorMode === 'visual' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'"
            >
              <Eye class="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Visual Mode</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider :delay-duration="0">
        <Tooltip>
          <TooltipTrigger as-child>
            <button 
              @click="emit('update:editorMode', 'source')"
              class="p-1.5 rounded-md transition-all"
              :class="editorMode === 'source'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'"
            >
              <Code class="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Source Mode</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
    
    <!-- Editor Toolbar (only in visual mode) -->
    <EditorToolbar 
      v-if="editorMode === 'visual'" 
      :get-editor="getEditor"
      class="flex-1"
    />
    
    <!-- Spacer -->
    <div class="flex-1" />
    
    <!-- Right: actions & Preview -->
    <div class="flex items-center gap-1">
      <!-- Live collaborator avatars from Yjs awareness -->
      <div v-if="otherUsers.length > 0" class="flex items-center -space-x-2 mr-2">
        <TooltipProvider v-for="user in otherUsers.slice(0, 3)" :key="user.clientId" :delay-duration="0">
          <Tooltip>
            <TooltipTrigger as-child>
              <div 
                class="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-xs font-medium text-white shadow-sm"
                :style="{ backgroundColor: user.color }"
              >
                {{ user.name.charAt(0).toUpperCase() }}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{{ user.name }}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div 
          v-if="otherUsers.length > 3" 
          class="w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium shadow-sm"
        >
          +{{ otherUsers.length - 3 }}
        </div>
      </div>
      
      <!-- Session member count (when no live awareness) -->
      <TooltipProvider v-else-if="sessionMemberCount > 1" :delay-duration="0">
        <Tooltip>
          <TooltipTrigger as-child>
            <div class="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-sm">
              <Users class="w-3.5 h-3.5" />
              <span>{{ sessionMemberCount }}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{{ sessionMemberCount }} collaborator{{ sessionMemberCount !== 1 ? 's' : '' }} in session</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <!-- Connection Status (when collaborating) -->
      <ConnectionStatus
        v-if="sessionMemberCount > 1 || otherUsers.length > 0"
        :status="props.connectionStatus"
        :show-text="false"
        :show-always="false"
      />
      
      <!-- Share button -->
      <TooltipProvider :delay-duration="0">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button 
              variant="ghost" 
              size="icon" 
              :disabled="!canShare"
              @click="emit('share')"
            >
              <Share2 class="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Share</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <SaveButton :can-save="canSave" :auto-save-status="props.autoSaveStatus" @save="emit('save')" />
      <ThemeToggle />
      <div class="w-px h-4 bg-border/50 mx-1" />
      <!-- Preview toggle -->
      <TooltipProvider :delay-duration="0">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button 
              variant="ghost" 
              size="icon"
              :class="{ 'bg-muted': showPreview }"
              @click="emit('update:showPreview', !showPreview)"
            >
              <PanelRightOpen class="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{{ showPreview ? 'Hide' : 'Show' }} Preview</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Eye, Code, Keyboard, PanelRightOpen, Share2, Users } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ConnectionStatus } from '@/components/ui/connection-status'
import { ThemeToggle, SidebarToggle, SaveButton } from '@/components/toolbar'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'
import { useAwareness } from '@/composables/useAwareness'

const { otherUsers } = useAwareness()

const props = defineProps<{
  canSave: boolean
  canShare: boolean
  sidebarVisible: boolean
  showPreview: boolean
  editorMode: 'visual' | 'source'
  sessionMemberCount: number
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  autoSaveStatus: 'idle' | 'saving' | 'saved'
  getEditor: () => any
}>()

const emit = defineEmits<{
  'command-palette': []
  'save': []
  'share': []
  'toggle-sidebar': []
  'update:showPreview': [show: boolean]
  'update:editorMode': [mode: 'visual' | 'source']
}>()
</script>
