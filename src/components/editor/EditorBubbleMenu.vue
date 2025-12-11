<template>
  <BubbleMenu 
    :editor="editor" 
    :tippy-options="{ duration: 100 }"
    v-if="editor"
    class="bubble-menu flex items-center gap-1 p-1 bg-popover border rounded-lg shadow-lg"
  >
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            class="h-8 w-8"
            :class="{ 'bg-muted': editor.isActive('bold') }"
            @click="editor.chain().focus().toggleBold().run()"
          >
            <Bold class="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Bold (Ctrl+B)</TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            class="h-8 w-8"
            :class="{ 'bg-muted': editor.isActive('italic') }"
            @click="editor.chain().focus().toggleItalic().run()"
          >
            <Italic class="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Italic (Ctrl+I)</TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            class="h-8 w-8"
            :class="{ 'bg-muted': editor.isActive('underline') }"
            @click="editor.chain().focus().toggleUnderline().run()"
          >
            <Underline class="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Underline (Ctrl+U)</TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <Separator orientation="vertical" class="h-6 mx-1" />

    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            class="h-8 w-8"
            :class="{ 'bg-muted': editor.isActive('strike') }"
            @click="editor.chain().focus().toggleStrike().run()"
          >
            <Strikethrough class="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Strikethrough</TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            class="h-8 w-8"
            :class="{ 'bg-muted': editor.isActive('code') }"
            @click="editor.chain().focus().toggleCode().run()"
          >
            <Code class="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Inline Code (Ctrl+E)</TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <Separator orientation="vertical" class="h-6 mx-1" />

    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            class="h-8 w-8"
            :class="{ 'bg-muted': editor.isActive('link') }"
            @click="toggleLink"
          >
            <Link class="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Link (Ctrl+K)</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </BubbleMenu>
</template>

<script setup lang="ts">
// TipTap v3 requires menus to be imported from subpath
import { BubbleMenu } from '@tiptap/vue-3/menus'
import type { Editor } from '@tiptap/vue-3'
import { Bold, Italic, Underline, Strikethrough, Code, Link } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const props = defineProps<{
  editor: Editor | undefined
}>()

function toggleLink() {
  if (!props.editor) return
  
  if (props.editor.isActive('link')) {
    props.editor.chain().focus().unsetLink().run()
  } else {
    const url = window.prompt('Enter URL')
    if (url) {
      props.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }
}
</script>

<style>
.bubble-menu {
  background: hsl(var(--popover));
  color: hsl(var(--popover-foreground));
}
</style>
