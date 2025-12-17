<template>
    <div class="inline-flex items-center align-middle mx-1">
        <PopoverRoot v-model:open="isOpen">
            <PopoverTrigger as-child>
                <div 
                    class="flex items-center gap-1.5 px-2 py-0.5 rounded-md cursor-pointer transition-colors border select-none"
                    :class="[
                        isOpen ? 'bg-yellow-100 border-yellow-300 text-yellow-900' : 'bg-yellow-50/80 border-yellow-200 text-yellow-700 hover:bg-yellow-100',
                        selected ? 'ring-2 ring-yellow-400 ring-offset-1' : ''
                    ]"
                >
                    <MessageSquareText class="w-3.5 h-3.5" />
                    <span class="text-xs font-medium max-w-[100px] truncate">{{ content || 'Empty comment' }}</span>
                </div>
            </PopoverTrigger>
            <PopoverPortal>
            <PopoverContent class="z-50 w-80 p-3 bg-popover text-popover-foreground rounded-md border shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2" @pointerdown.stop @mousedown.stop :side-offset="5">
                <div class="flex flex-col gap-2">
                    <span class="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <MessageSquareText class="w-3 h-3" />
                        Edit Comment
                    </span>
                    <textarea 
                        v-model="localContent" 
                        class="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none focus-visible:ring-yellow-400"
                        placeholder="Write your comment..."
                        @keydown.stop
                    />
                    <div class="flex justify-between items-center mt-1">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            class="text-xs text-destructive h-7 px-2 hover:bg-destructive/10"
                            @click="deleteComment"
                        >
                            Delete
                        </Button>
                        <Button 
                            size="sm" 
                            class="h-7 text-xs bg-yellow-500 hover:bg-yellow-600 text-white"
                            @click="saveComment"
                        >
                            Save
                        </Button>
                    </div>
                </div>
            </PopoverContent>
            </PopoverPortal>
        </PopoverRoot>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { MessageSquareText } from 'lucide-vue-next'
import { PopoverRoot, PopoverTrigger, PopoverContent, PopoverPortal } from 'radix-vue'
import { Button } from '@/components/ui/button'
import { useNodeViewContext } from '@prosemirror-adapter/vue'

const { node, setAttrs, selected, view, getPos } = useNodeViewContext()

const content = ref(node.value.attrs.content)
const localContent = ref(content.value)
const isOpen = ref(false)

// Sync from node props
watch(() => node.value.attrs.content, (newVal) => {
    content.value = newVal
    if (!isOpen.value) {
        localContent.value = newVal
    }
})

// Focus text area on open
watch(isOpen, (open) => {
    if (open) {
        localContent.value = content.value
        // Reset selection to avoid deleting node when typing
        // view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, getPos()!)))
    } else {
        // Validation/Save on close usage? Usually better to explicit save.
    }
})

function saveComment() {
    setAttrs({ content: localContent.value })
    content.value = localContent.value
    isOpen.value = false
}

function deleteComment() {
    const pos = getPos()
    if (typeof pos === 'number') {
        const tr = view.state.tr.delete(pos, pos + node.value.nodeSize)
        view.dispatch(tr)
    }
    isOpen.value = false
}
</script>
