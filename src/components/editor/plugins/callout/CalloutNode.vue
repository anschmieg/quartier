<template>
  <div 
    class="callout"
    :class="[
      `callout-${calloutType}`,
      `callout-appearance-${appearance}`,
      { 'callout-collapsible': isCollapsible },
      { 'callout-no-icon': !showIcon },
      { 'has-implicit-title': hasImplicitTitle },
      { 'is-cross-ref': !!crossRefPrefix }
    ]"
    :data-callout-type="calloutType"
    :id="node.attrs?.id"
  >
    <!-- Header (clickable for collapse) -->
    <div 
      class="callout-header"
      :class="{ 'callout-header-clickable': isCollapsible }"
      contenteditable="false"
      @click="toggleCollapse"
    >
      <!-- Icon -->
      <div v-if="showIcon" class="callout-icon">
        <component :is="iconComponent" class="callout-icon-svg" />
      </div>
      
      <!-- Title -->
      <!-- Title (Editable) -->
      <input
        class="callout-title-input"
        :value="title || ''"
        :placeholder="displayDefault"
        @input="onTitleInput"
        @click.stop
        @keydown.stop
      />
      
      <!-- Settings Menu -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="icon" class="h-6 w-6 opacity-50 hover:opacity-100 mr-1" @click.stop>
            <SettingsIcon class="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuLabel>Type</DropdownMenuLabel>
          <DropdownMenuRadioGroup v-model="calloutTypeAttr">
             <DropdownMenuRadioItem value="note">Note</DropdownMenuRadioItem>
             <DropdownMenuRadioItem value="tip">Tip</DropdownMenuRadioItem>
             <DropdownMenuRadioItem value="warning">Warning</DropdownMenuRadioItem>
             <DropdownMenuRadioItem value="caution">Caution</DropdownMenuRadioItem>
             <DropdownMenuRadioItem value="important">Important</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />

          <DropdownMenuLabel>Appearance</DropdownMenuLabel>
          <DropdownMenuRadioGroup v-model="appearanceAttr">
            <DropdownMenuRadioItem value="default">Default</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="simple">Simple</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="minimal">Minimal</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          
          <DropdownMenuLabel>Options</DropdownMenuLabel>
          <DropdownMenuCheckboxItem 
            :model-value="isCollapsibleAttr"
            @select.prevent="isCollapsibleAttr = !isCollapsibleAttr"
          >
            Collapsible
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem 
            :model-value="showIconAttr"
            @select.prevent="showIconAttr = !showIconAttr"
          >
            Show Icon
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          
          <DropdownMenuLabel>Cross-Ref ID</DropdownMenuLabel>
          <div class="px-2 pb-2 flex items-center gap-1">
             <span class="text-xs text-muted-foreground font-mono select-none" v-if="crossRefPrefix">{{ crossRefPrefix }}-</span>
             <Input 
              v-model="idSuffixAttr" 
              placeholder="suffix" 
              class="h-8 font-mono text-xs" 
              @click.stop 
              @keydown.stop 
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <!-- Collapse toggle -->
      <button 
        v-if="isCollapsible"
        class="callout-toggle"
        type="button"
        :aria-expanded="!isCollapsed"
        @click.stop="toggleCollapse"
      >
        <ChevronDown 
          class="callout-toggle-icon" 
          :class="{ 'callout-toggle-icon-expanded': !isCollapsed }"
        />
      </button>
    </div>
    
    <!-- Content -->
    <div 
      v-show="!isCollapsed"
      class="callout-content"
      :ref="contentRef"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useNodeViewContext } from '@prosemirror-adapter/vue'
import { 
  InfoIcon, 
  AlertTriangle, 
  AlertCircle, 
  Lightbulb, 
  ShieldAlert,
  ChevronDown,
  Settings as SettingsIcon,
} from 'lucide-vue-next'
import type { CalloutType } from './index'

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const { node, contentRef, view, getPos } = useNodeViewContext()

// Callout attributes
const calloutType = computed<CalloutType>(() => node.value.attrs?.type || 'note')
const title = computed(() => node.value.attrs?.title || '')
const collapse = computed(() => node.value.attrs?.collapse || '')
const appearance = computed(() => node.value.attrs?.appearance || 'default')
const icon = computed(() => node.value.attrs?.icon !== 'false')

// Helper to check for implicit title (first child is heading)
const firstChildIsHeading = computed(() => {
  const firstChild = node.value.content?.firstChild
  return firstChild?.type.name === 'heading'
})

const hasImplicitTitle = computed(() => !title.value && firstChildIsHeading.value)

// Promote Implicit Title Logic
function promoteImplicitTitle() {
  const pos = getPos?.()
  if (typeof pos !== 'number') return

  const firstChild = node.value.content?.firstChild
  if (!firstChild || firstChild.type.name !== 'heading') return

  const headingText = firstChild.textContent
  const headingSize = firstChild.nodeSize

  const tr = view.state.tr
  tr.setNodeAttribute(pos, 'title', headingText)
  tr.delete(pos + 1, pos + 1 + headingSize)
  view.dispatch(tr)
}

// Watch and Promote
watch(hasImplicitTitle, (val) => {
  if (val) promoteImplicitTitle()
})

onMounted(() => {
  if (hasImplicitTitle.value) promoteImplicitTitle()
})

// Cross-reference detection (and prefix helper)
function getPrefixForType(type: string): string {
  const map: Record<string, string> = {
    note: 'nte',
    tip: 'tip',
    warning: 'wrn',
    important: 'imp',
    caution: 'cau'
  }
  return map[type] || 'nte'
}

const crossRefPrefix = computed(() => getPrefixForType(calloutType.value))

// Collapse state
const isCollapsible = computed(() => collapse.value === 'true' || collapse.value === 'false')
const isCollapsed = ref(collapse.value === 'true')
const showIcon = computed(() => {
  if (appearance.value === 'minimal') return false
  return icon.value
})

const displayDefault = computed(() => {
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
    note: InfoIcon,
    warning: AlertTriangle,
    important: AlertCircle,
    tip: Lightbulb,
    caution: ShieldAlert,
  }
  return icons[calloutType.value] || InfoIcon
})

function onTitleInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  const pos = getPos?.()
  if (typeof pos === 'number') {
    const tr = view.state.tr
    tr.setNodeAttribute(pos, 'title', value)
    view.dispatch(tr)
  }
}

// Attribute Updaters
function updateAttr(key: string, value: any) {
  const pos = getPos?.()
  if (typeof pos !== 'number') return
  const tr = view.state.tr
  tr.setNodeAttribute(pos, key, value)
  view.dispatch(tr)
}

// Quarto Logic:
// Collapse: 
// - If absent -> Not collapsible (unless we want to support 'default' behavior which is non-collapsible)
// - If present ("true" or "false") -> Collapsible.
// UI Toggle "Collapsible" should mean "Active" (collapsible=false by default) vs "Inactive" (collapsible=null).
const isCollapsibleAttr = computed({
  get: () => {
    // Check if attribute is set to "true" or "false". If null/undefined/empty, it's not collapsible.
    const val = collapse.value
    return val === 'true' || val === 'false'
  },
  set: (val) => {
    console.log('Sets collapsible:', val)
    // If enabling, default to "false" (expanded). If disabling, remove attribute (null).
    updateAttr('collapse', val ? 'false' : null)
  }
})

const showIconAttr = computed({
  get: () => {
     // Default is true. Only false if explicitly "false".
     console.log('Get Icon:', icon.value)
     return icon.value
  },
  set: (val) => {
    console.log('Sets icon:', val)
    // If true (show), remove attribute (default). If false (hide), set "false".
    updateAttr('icon', val ? null : 'false')
  }
})

const appearanceAttr = computed({
  get: () => appearance.value,
  set: (val) => updateAttr('appearance', val)
})

const calloutTypeAttr = computed({
  get: () => calloutType.value,
  set: (val) => {
    // When type changes, we also update ID if it follows the pattern
    // Or we just update type, and ID prefix updates reactively?
    // Wait, ID is stored in attribute. We must update ID attribute to match new prefix.
    const currentSuffix = idSuffixAttr.value
    const newPrefix = getPrefixForType(val)
    
    // Batch update?
    const pos = getPos?.()
    if (typeof pos !== 'number') return
    const tr = view.state.tr
    tr.setNodeAttribute(pos, 'type', val)
    if (currentSuffix) {
       tr.setNodeAttribute(pos, 'id', `${newPrefix}-${currentSuffix}`)
    }
    view.dispatch(tr)
  }
})

const idSuffixAttr = computed({
  get: () => {
    const id = node.value.attrs?.id || ''
    const prefix = crossRefPrefix.value
    if (id.startsWith(prefix + '-')) {
      return id.slice(prefix.length + 1)
    }
    // If ID doesn't match prefix, treat whole as suffix or empty?
    // User said "id is automatically prefixed".
    // Try to be smart.
    return id
  },
  set: (val) => {
     const prefix = crossRefPrefix.value
     const newId = val ? `${prefix}-${val}` : ''
     updateAttr('id', newId)
  }
})

function toggleCollapse() {
  if (isCollapsible.value) {
    isCollapsed.value = !isCollapsed.value
  }
}
</script>

<style scoped>
/* Base callout styling - following Quarto's design */
.callout {
  margin: 1.25em 0;
  border-radius: 0.25rem;
  border-left: 5px solid;
  overflow: hidden;
}

/* Callout header */
.callout-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-weight: 600;
  font-size: 0.95rem;
}

.callout-header-clickable {
  cursor: pointer;
  user-select: none;
}

.callout-header-clickable:hover {
  opacity: 0.9;
}

/* Icon */
.callout-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.callout-icon-svg {
  width: 1.1rem;
  height: 1.1rem;
}

/* Title */
.callout-title {
  flex: 1;
  min-width: 0;
}

/* Collapse toggle */
.callout-toggle {
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.15s, transform 0.15s;
}

.callout-toggle:hover {
  opacity: 1;
}

.callout-toggle-icon {
  width: 1rem;
  height: 1rem;
  transition: transform 0.2s ease;
}

.callout-toggle-icon-expanded {
  transform: rotate(180deg);
}

/* Content */
.callout-content {
  padding: 0 0.75rem 0.75rem 0.75rem;
  font-size: 0.9rem;
}

.callout-content:deep(> :first-child) {
  margin-top: 0;
}

.callout-content:deep(> :last-child) {
  margin-bottom: 0;
}

.callout-content:deep(> :last-child) {
  margin-bottom: 0;
}

/* Editable Title Input */
.callout-title-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  font-weight: inherit;
  font-size: inherit;
  color: inherit;
  padding: 0;
  margin: 0;
  outline: none;
}
.callout-title-input::placeholder {
  color: inherit;
  opacity: 0.7;
}

/* ========================================
   CROSS-REFERENCE NUMBERING
   ======================================== */
/* Common styles for the number prefix */
.is-cross-ref .callout-title::before {
  font-weight: bold;
  margin-right: 0.2em;
}

/* Explicit counters per type */
/* Tip (#tip-) */
.callout-tip.is-cross-ref { counter-increment: callout-tip; }
.callout-tip.is-cross-ref .callout-title::before { content: "Tip " counter(callout-tip) ": "; }

/* Note (#nte-) */
.callout-note.is-cross-ref { counter-increment: callout-nte; }
.callout-note.is-cross-ref .callout-title::before { content: "Note " counter(callout-nte) ": "; }

/* Warning (#wrn-) */
.callout-warning.is-cross-ref { counter-increment: callout-wrn; }
.callout-warning.is-cross-ref .callout-title::before { content: "Warning " counter(callout-wrn) ": "; }

/* Important (#imp-) */
.callout-important.is-cross-ref { counter-increment: callout-imp; }
.callout-important.is-cross-ref .callout-title::before { content: "Important " counter(callout-imp) ": "; }

/* Caution (#cau-) */
.callout-caution.is-cross-ref { counter-increment: callout-cau; }
.callout-caution.is-cross-ref .callout-title::before { content: "Caution " counter(callout-cau) ": "; }


/* ========================================
   CALLOUT TYPES - Quarto official colors
   ======================================== */

/* Note - Blue */
.callout-note {
  border-left-color: #0d6efd;
  background-color: rgba(13, 110, 253, 0.1);
}
.callout-note .callout-header {
  color: #0d6efd;
}

/* Tip - Green */
.callout-tip {
  border-left-color: #198754;
  background-color: rgba(25, 135, 84, 0.1);
}
.callout-tip .callout-header {
  color: #198754;
}

/* Warning - Orange/Yellow */
.callout-warning {
  border-left-color: #ffc107;
  background-color: rgba(255, 193, 7, 0.1);
}
.callout-warning .callout-header {
  color: #997404;
}

/* Caution - Orange */
.callout-caution {
  border-left-color: #fd7e14;
  background-color: rgba(253, 126, 20, 0.1);
}
.callout-caution .callout-header {
  color: #ca6510;
}

/* Important - Red */
.callout-important {
  border-left-color: #dc3545;
  background-color: rgba(220, 53, 69, 0.1);
}
.callout-important .callout-header {
  color: #dc3545;
}

/* ========================================
   APPEARANCE VARIANTS
   ======================================== */

/* Simple - no background, translucent header */
.callout-appearance-simple {
  background-color: transparent !important;
  border-left-width: 5px; /* Keep colored border */
}

.callout-appearance-simple .callout-header {
  background-color: transparent;
  padding-left: 0; /* Align with text */
  opacity: 0.9;
}

/* Minimal - no icon, thin border, no background */
.callout-appearance-minimal {
  background-color: transparent !important;
  border-left-width: 3px;
  /* Minimal typically has no header background and no icon */
}

.callout-appearance-minimal .callout-header {
  padding-left: 0.5rem;
  background-color: transparent;
}

/* ========================================
   NO ICON
   ======================================== */
.callout-no-icon .callout-content {
  padding-left: 0.75rem;
}

/* ========================================
   DARK MODE
   ======================================== */
:global(.dark) .callout-note {
  background-color: rgba(13, 110, 253, 0.15);
}
:global(.dark) .callout-tip {
  background-color: rgba(25, 135, 84, 0.15);
}
:global(.dark) .callout-warning {
  background-color: rgba(255, 193, 7, 0.15);
}
:global(.dark) .callout-caution {
  background-color: rgba(253, 126, 20, 0.15);
}
:global(.dark) .callout-important {
  background-color: rgba(220, 53, 69, 0.15);
}

:global(.dark) .callout-appearance-simple,
:global(.dark) .callout-appearance-minimal {
  background-color: transparent !important;
}
</style>
