<template>
    <div 
        class="comment-block"
        :class="[`comment-${commentType.toLowerCase()}`]"
        contenteditable="false"
        @click.stop
        @mousedown.stop
    >
        <!-- Header -->
        <div class="comment-header">
            <!-- Icon -->
            <div class="comment-icon">
                <component :is="iconComponent" class="comment-icon-svg" />
            </div>
            
            <!-- Editable Content (auto-expanding textarea for multiline) -->
            <textarea
                ref="textareaRef"
                class="comment-textarea"
                :value="contentText"
                :placeholder="placeholder"
                rows="1"
                @input="onInput"
                @click.stop
                @keydown.stop
            />
            
            <!-- Settings Menu -->
            <DropdownMenu>
                <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon" class="h-6 w-6 opacity-50 hover:opacity-100" @click.stop @mousedown.stop>
                        <SettingsIcon class="h-3.5 w-3.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="w-48">
                    <DropdownMenuLabel>Type</DropdownMenuLabel>
                    <DropdownMenuRadioGroup v-model="typeAttr">
                        <DropdownMenuRadioItem value="comment">Comment</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="TODO">TODO</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="FIX">FIX</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="NOTE">NOTE</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="WARNING">WARNING</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="DONE">DONE</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem class="text-destructive" @select="deleteComment">
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick, onMounted } from 'vue'
import { 
    MessageSquareText, AlertCircle, CheckCircle2, Info, 
    AlertTriangle, Wrench, Settings as SettingsIcon 
} from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useNodeViewContext } from '@prosemirror-adapter/vue'

const { node, setAttrs, view, getPos } = useNodeViewContext()

const rawContent = ref(node.value.attrs.content || '')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// --- Parsing ---
const PREFIX_REGEX = /^(TODO|FIX|NOTE|WARNING|DONE):\s*/i
const parsed = computed(() => {
    const text = rawContent.value
    const match = text.match(PREFIX_REGEX)
    if (match) {
        return { type: match[1].toUpperCase(), text: text.replace(match[0], '').trim() }
    }
    return { type: 'comment', text: text }
})

const commentType = computed(() => parsed.value.type)
const contentText = computed(() => parsed.value.text)
const placeholder = computed(() => commentType.value === 'comment' ? 'Add comment...' : `${commentType.value}...`)

// Icons
const ICONS: Record<string, any> = {
    comment: MessageSquareText,
    TODO: AlertCircle,
    FIX: Wrench,
    NOTE: Info,
    WARNING: AlertTriangle,
    DONE: CheckCircle2
}
const iconComponent = computed(() => ICONS[commentType.value] || MessageSquareText)

// Type attribute binding
const typeAttr = computed({
    get: () => commentType.value,
    set: (newType: string) => {
        const text = parsed.value.text
        const newContent = newType === 'comment' ? text : `${newType}: ${text}`
        setAttrs({ content: newContent })
        rawContent.value = newContent
    }
})

// Auto-resize textarea
function autoResize() {
    const el = textareaRef.value
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
}

// --- Actions ---
watch(() => node.value.attrs.content, (newVal) => {
    rawContent.value = newVal || ''
    nextTick(autoResize)
}, { immediate: true })

onMounted(() => {
    nextTick(autoResize)
})

function onInput(e: Event) {
    const target = e.target as HTMLTextAreaElement
    const text = target.value
    const prefix = commentType.value === 'comment' ? '' : `${commentType.value}: `
    const newContent = prefix + text
    setAttrs({ content: newContent })
    rawContent.value = newContent
    autoResize()
}

function deleteComment() {
    const pos = getPos()
    if (typeof pos === 'number') {
        view.dispatch(view.state.tr.delete(pos, pos + node.value.nodeSize))
    }
}
</script>

<style scoped>
/* ========================================
   COMMENT BLOCK - Callout-style
   ======================================== */

.comment-block {
    display: block;
    margin: 0.5rem 0;
    border-radius: 0.375rem;
    border-left: 4px solid;
    overflow: hidden;
    transition: background-color 0.15s ease, box-shadow 0.15s ease;
}

/* Header */
.comment-header {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    font-weight: 600;
    font-size: 0.875rem;
    transition: color 0.15s ease;
}

.comment-icon {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    flex-shrink: 0;
    padding-top: 0.125rem;
}

.comment-icon-svg {
    width: 1rem;
    height: 1rem;
}

/* Editable Textarea - auto-expanding multiline */
.comment-textarea {
    flex: 1;
    min-width: 0;
    min-height: 1.25rem;
    max-height: 200px;
    background: transparent;
    border: none;
    font-weight: inherit;
    font-size: inherit;
    font-family: inherit;
    line-height: 1.4;
    color: inherit;
    padding: 0;
    margin: 0;
    outline: none;
    resize: none;
    overflow-y: auto;
    transition: color 0.15s ease;
}

.comment-textarea::placeholder {
    color: inherit;
    opacity: 0.5;
}

/* Focus state - high contrast when editing */
.comment-block:focus-within {
    box-shadow: 0 0 0 2px hsl(var(--ring) / 0.3);
}

.comment-block:focus-within .comment-input {
    color: hsl(var(--foreground));
}

/* ========================================
   COMMENT TYPES - More vibrant colors
   ======================================== */

/* Comment - Gray */
.comment-comment {
    border-left-color: #64748b;
    background-color: rgba(100, 116, 139, 0.12);
}
.comment-comment .comment-header { color: #475569; }
:global(.dark) .comment-comment { background-color: rgba(100, 116, 139, 0.2); }
:global(.dark) .comment-comment .comment-header { color: #94a3b8; }

/* TODO - Amber (more saturated) */
.comment-todo {
    border-left-color: #f59e0b;
    background-color: rgba(245, 158, 11, 0.15);
}
.comment-todo .comment-header { color: #92400e; }
:global(.dark) .comment-todo { background-color: rgba(245, 158, 11, 0.2); }
:global(.dark) .comment-todo .comment-header { color: #fbbf24; }

/* FIX - Rose (more saturated) */
.comment-fix {
    border-left-color: #e11d48;
    background-color: rgba(225, 29, 72, 0.12);
}
.comment-fix .comment-header { color: #9f1239; }
:global(.dark) .comment-fix { background-color: rgba(225, 29, 72, 0.2); }
:global(.dark) .comment-fix .comment-header { color: #fb7185; }

/* NOTE - Sky (more saturated) */
.comment-note {
    border-left-color: #0284c7;
    background-color: rgba(2, 132, 199, 0.12);
}
.comment-note .comment-header { color: #075985; }
:global(.dark) .comment-note { background-color: rgba(2, 132, 199, 0.2); }
:global(.dark) .comment-note .comment-header { color: #38bdf8; }

/* WARNING - Orange (more saturated) */
.comment-warning {
    border-left-color: #ea580c;
    background-color: rgba(234, 88, 12, 0.12);
}
.comment-warning .comment-header { color: #9a3412; }
:global(.dark) .comment-warning { background-color: rgba(234, 88, 12, 0.2); }
:global(.dark) .comment-warning .comment-header { color: #fb923c; }

/* DONE - Emerald (more saturated) */
.comment-done {
    border-left-color: #059669;
    background-color: rgba(5, 150, 105, 0.12);
}
.comment-done .comment-header { color: #047857; }
:global(.dark) .comment-done { background-color: rgba(5, 150, 105, 0.2); }
:global(.dark) .comment-done .comment-header { color: #34d399; }
</style>
