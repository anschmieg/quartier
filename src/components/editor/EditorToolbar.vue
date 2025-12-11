<template>
  <div class="editor-toolbar flex items-center gap-1 p-2 border-b bg-background">
    <!-- Headings Dropdown -->
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" class="gap-1">
          <Heading class="w-4 h-4" />
          <span class="text-xs">Heading</span>
          <ChevronDown class="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem @click="setHeading(1)">
          <span class="text-lg font-bold">Heading 1</span>
        </DropdownMenuItem>
        <DropdownMenuItem @click="setHeading(2)">
          <span class="text-base font-bold">Heading 2</span>
        </DropdownMenuItem>
        <DropdownMenuItem @click="setHeading(3)">
          <span class="text-sm font-bold">Heading 3</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="setParagraph">
          <span>Paragraph</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <Separator orientation="vertical" class="h-6" />

    <!-- List Buttons -->
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            :class="{ 'bg-muted': editor?.isActive('bulletList') }"
            @click="toggleBulletList"
          >
            <List class="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Bullet List (Ctrl+Shift+8)</TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            :class="{ 'bg-muted': editor?.isActive('orderedList') }"
            @click="toggleOrderedList"
          >
            <ListOrdered class="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Ordered List (Ctrl+Shift+7)</TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <Separator orientation="vertical" class="h-6" />

    <!-- Block Elements -->
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            :class="{ 'bg-muted': editor?.isActive('blockquote') }"
            @click="toggleBlockquote"
          >
            <Quote class="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Blockquote</TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            :class="{ 'bg-muted': editor?.isActive('codeBlock') }"
            @click="toggleCodeBlock"
          >
            <Code class="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Code Block</TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <Separator orientation="vertical" class="h-6" />

    <!-- Link & Image -->
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            :class="{ 'bg-muted': editor?.isActive('link') }"
            @click="setLink"
          >
            <Link class="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Insert Link (Ctrl+K)</TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" @click="addImage">
            <Image class="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Insert Image</TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <div class="flex-1" />

    <!-- Undo/Redo -->
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            :disabled="!editor?.can().undo()"
            @click="undo"
          >
            <Undo class="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            :disabled="!editor?.can().redo()"
            @click="redo"
          >
            <Redo class="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
</template>

<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { 
  Heading, ChevronDown, List, ListOrdered, Quote, Code, 
  Link, Image, Undo, Redo 
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const props = defineProps<{
  editor: Editor | undefined
}>()

function setHeading(level: 1 | 2 | 3) {
  props.editor?.chain().focus().toggleHeading({ level }).run()
}

function setParagraph() {
  props.editor?.chain().focus().setParagraph().run()
}

function toggleBulletList() {
  props.editor?.chain().focus().toggleBulletList().run()
}

function toggleOrderedList() {
  props.editor?.chain().focus().toggleOrderedList().run()
}

function toggleBlockquote() {
  props.editor?.chain().focus().toggleBlockquote().run()
}

function toggleCodeBlock() {
  props.editor?.chain().focus().toggleCodeBlock().run()
}

function setLink() {
  const url = window.prompt('Enter URL')
  if (url) {
    props.editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }
}

function addImage() {
  const url = window.prompt('Enter image URL')
  if (url) {
    props.editor?.chain().focus().setImage({ src: url }).run()
  }
}

function undo() {
  props.editor?.chain().focus().undo().run()
}

function redo() {
  props.editor?.chain().focus().redo().run()
}
</script>
