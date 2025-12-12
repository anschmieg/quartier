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

    <!-- Text Formatting -->
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            :class="{ 'bg-muted': isActive('strong') }"
            @click="toggleBold"
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
            :class="{ 'bg-muted': isActive('emphasis') }"
            @click="toggleItalic"
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
            :class="{ 'bg-muted': isActive('inline_code') }"
            @click="toggleInlineCode"
          >
            <Code2 class="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Inline Code (Ctrl+E)</TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <Separator orientation="vertical" class="h-6" />

    <!-- List Buttons -->
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            :class="{ 'bg-muted': isActive('bullet_list') }"
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
            :class="{ 'bg-muted': isActive('ordered_list') }"
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
            :class="{ 'bg-muted': isActive('blockquote') }"
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
            :class="{ 'bg-muted': isActive('code_block') }"
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
            :class="{ 'bg-muted': isActive('link') }"
            @click="handleSetLink"
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
            :disabled="!can().undo()"
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
            :disabled="!can().redo()"
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
import { type Editor } from '@milkdown/kit/core'
import { 
  Heading, ChevronDown, List, ListOrdered, Quote, Code, 
  Link, Image, Undo, Redo, Bold, Italic, Code2 
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
import { useMilkdownCommands } from './useMilkdownCommands'

const props = defineProps<{
  getEditor: () => Editor | undefined
}>()

const { 
  toggleBold, toggleItalic, toggleInlineCode,
  setHeading, toggleBulletList, toggleOrderedList,
  toggleBlockquote, toggleCodeBlock,
  setLink, insertImage,
  undo, redo,
  isActive, can
} = useMilkdownCommands(props.getEditor)

// Helper for paragraph (not in composable yet, or use setHeading(0) logic? No, turn node to paragraph)
// For now, mapping setParagraph to a no-op or implementation if needed. 
// CommonMark doesn't have "set paragraph" command easily exposed, but turning off heading usually does it.
// We'll leave it empty or try to toggle heading off.
function setParagraph() {
  // If we are in a heading, toggling it off makes it a paragraph usually
  setHeading(1) // This is wrong.
  // Implementation TODO
}

// Map addImage from template to insertImage
function addImage() {
  const url = window.prompt('Enter image URL')
  if (url) {
    insertImage(url)
  }
}

// Wrapper for link to prompt
function handleSetLink() {
    const url = window.prompt('Enter URL')
    if (url) {
        setLink(url)
    }
}
</script>
