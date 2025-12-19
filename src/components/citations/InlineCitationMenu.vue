<template>
  <div 
    v-show="visible"
    ref="menuRef"
    class="fixed z-50 w-[400px] bg-popover text-popover-foreground border rounded-md shadow-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
    :style="style"
  >
    <!-- Header: Search & Tabs -->
    <div class="border-b bg-muted/30 p-2 space-y-2">
       <div class="flex items-center gap-1 bg-muted p-1 rounded-md">
          <button 
             v-for="tab in tabs" 
             :key="tab.id"
             @click="currentTab = tab.id"
             class="flex-1 text-xs font-medium px-2 py-1 rounded-sm transition-all"
             :class="currentTab === tab.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'"
          >
             {{ tab.label }}
          </button>
       </div>
       <div class="relative">
          <Search class="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
             ref="inputRef"
             v-model="query"
             class="flex h-9 w-full rounded-md border border-input bg-transparent px-8 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
             placeholder="Search citations..."
             @keydown.down.prevent="moveSelection(1)"
             @keydown.up.prevent="moveSelection(-1)"
             @keydown.enter.prevent="selectCurrent"
             @keydown.esc.prevent="$emit('close')"
          />
       </div>
    </div>

    <!-- Zotero Settings (When unauthenticated) -->
    <div v-if="currentTab === 'zotero' && !isZoteroAuth" class="p-4 space-y-4">
        <div class="text-xs text-muted-foreground">
            <p>Configure Zotero access to search your library.</p>
            <a href="https://www.zotero.org/settings/keys" target="_blank" class="text-primary underline">Get API Key</a>
        </div>
        <div class="space-y-2">
            <!-- User ID is auto-fetched from key -->
            <div class="flex gap-2">
                <input 
                    v-model="configForm.apiKey" 
                    placeholder="Enter your Zotero API Key" 
                    type="password"
                    class="flex-1 text-xs p-1.5 rounded border bg-transparent"
                    :disabled="validating"
                />
                <button 
                    @click="saveZoteroConfig"
                    class="bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded hover:bg-primary/90 flex items-center justify-center min-w-[60px]"
                    :disabled="validating || !configForm.apiKey"
                >
                    <Loader2 v-if="validating" class="w-3 h-3 animate-spin" />
                    <span v-else>Connect</span>
                </button>
            </div>
            <p v-if="validationError" class="text-[10px] text-red-400">
                {{ validationError }}
            </p>
        </div>
    </div>

    <!-- Results List -->
    <div v-else class="max-h-[300px] overflow-y-auto p-1">
       <div v-if="loading" class="flex items-center justify-center p-4 text-muted-foreground text-xs">
          <Loader2 class="w-4 h-4 mr-2 animate-spin" />
          Searching...
       </div>
       
       <div v-else-if="items.length === 0" class="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
          <p class="text-sm">No results found</p>
          <p v-if="currentTab === 'library' && !isZoteroAuth" class="text-xs mt-2 text-red-400">
             Zotero not configured.
          </p>
       </div>

       <template v-else>
          <button
             v-for="(item, index) in items"
             :key="item.id || index"
             class="w-full text-left flex flex-col gap-1 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors"
             :class="index === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'"
             @click="selectItem(item)"
             @mousemove="selectedIndex = index"
          >
             <div class="font-medium truncate">{{ item.title || 'Untitled' }}</div>
             <div class="flex items-center justify-between text-xs text-muted-foreground">
                <span class="truncate max-w-[200px]">
                    {{ formatAuthors(item.author) }}
                </span>
                <span>{{ formatYear(item.issued) }}</span>
             </div>
          </button>
       </template>
    </div>
    
    <!-- Footer -->
    <div class="border-t bg-muted/30 p-1 px-2 text-[10px] text-muted-foreground flex justify-between items-center">
       <span>Enter to insert</span>
       <span v-if="currentTab === 'library'">Via {{ isZoteroAuth ? 'Zotero' : 'Crossref' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Search, Loader2 } from 'lucide-vue-next'
import { useDebounceFn, onClickOutside } from '@vueuse/core'
import { zoteroService, zoteroConfig } from '@/services/citations/zotero'
import { crossrefService } from '@/services/citations/crossref'
import { bibtexService } from '@/services/citations/bibtex'
import type { CitationItem } from '@/services/citations/types'

const props = defineProps<{
  visible: boolean
  coords: { x: number, y: number }
  initialQuery?: string
  projectBib?: string // Content of references.bib
}>()

const emit = defineEmits<{
  (e: 'select', item: CitationItem): void
  (e: 'close'): void
}>()

// State
const inputRef = ref<HTMLInputElement>()
const menuRef = ref<HTMLElement>()
const query = ref('')
const currentTab = ref<'project' | 'crossref' | 'zotero'>('project')

const configForm = ref({
    apiKey: zoteroConfig.value.apiKey || ''
})
const validating = ref(false)
const validationError = ref('')

const saveZoteroConfig = async () => {
    if (!configForm.value.apiKey) return
    
    validating.value = true
    validationError.value = ''
    
    try {
        const { userId, username } = await zoteroService.validateKey(configForm.value.apiKey)
        
        // Save
        zoteroConfig.value.apiKey = configForm.value.apiKey
        zoteroConfig.value.userId = userId
        
        // Trigger search
        doSearch()
    } catch (e) {
        validationError.value = e instanceof Error ? e.message : 'Validation failed'
    } finally {
        validating.value = false
    }
}
const loading = ref(false)
const items = ref<CitationItem[]>([])
const selectedIndex = ref(0)

const tabs = [
    { id: 'project', label: 'Project' },
    { id: 'crossref', label: 'Crossref' },
    { id: 'zotero', label: 'Zotero' }
]

const isZoteroAuth = computed(() => zoteroService.isAuthenticated())

// Positioning
const style = computed(() => ({
    top: `${props.coords.y + 24}px`, // Slight offset
    left: `${props.coords.x}px`
}))

// Methods
const formatAuthors = (authors: any[]) => {
    if (!authors || authors.length === 0) return 'Unknown'
    if (authors.length === 1) return authors[0].family || authors[0].given || authors[0].literal
    if (authors.length === 2) return `${authors[0].family} & ${authors[1].family}`
    return `${authors[0].family} et al.`
}

const formatYear = (issued: any) => {
    return issued?.['date-parts']?.[0]?.[0] || 'n.d.'
}

const moveSelection = (delta: number) => {
    const newIndex = selectedIndex.value + delta
    if (newIndex >= 0 && newIndex < items.value.length) {
        selectedIndex.value = newIndex
        // Scroll into view logic could go here
    }
}

const selectCurrent = () => {
    if (items.value[selectedIndex.value]) {
        selectItem(items.value[selectedIndex.value])
    }
}

const selectItem = (item: CitationItem) => {
    emit('select', item)
}

const parsedProjectItems = ref<CitationItem[]>([])

// Cache parsed bib items
watch(() => props.projectBib, async (newVal) => {
    if (newVal) {
        try {
            parsedProjectItems.value = await bibtexService.parse(newVal)
        } catch (e) {
            console.error('Failed to parse bibtex', e)
            parsedProjectItems.value = []
        }
    } else {
        parsedProjectItems.value = []
    }
}, { immediate: true })

// Search Logic
const doSearch = useDebounceFn(async () => {
    loading.value = true
    const SEARCH_LIMIT = 5

    try {
        if (currentTab.value === 'project') {
            // Filter locally
            const q = query.value.toLowerCase()
            items.value = parsedProjectItems.value
                .filter(i => 
                    i.title?.toLowerCase().includes(q) || 
                    i.id.toLowerCase().includes(q) ||
                    JSON.stringify(i.author).toLowerCase().includes(q)
                )
                .slice(0, SEARCH_LIMIT)
        } else if (currentTab.value === 'zotero') {
            if (isZoteroAuth.value) {
                // Search Zotero
                const res = await zoteroService.search(query.value, SEARCH_LIMIT)
                items.value = res.items
            } else {
                items.value = []
            }
        } else {
            // Crossref
            const res = await crossrefService.search(query.value, SEARCH_LIMIT)
            items.value = res.items
        }
        selectedIndex.value = 0
    } catch (e) {
        console.error('Search error', e)
        items.value = []
    } finally {
        loading.value = false
    }
}, 300)

// Hooks
watch([() => props.visible, currentTab], () => {
    if (props.visible) {
        nextTick(() => inputRef.value?.focus())
        if (props.initialQuery && query.value !== props.initialQuery) {
            query.value = props.initialQuery
        }
        doSearch()
    }
})

watch(query, () => doSearch())

onClickOutside(menuRef, () => emit('close'))
</script>
