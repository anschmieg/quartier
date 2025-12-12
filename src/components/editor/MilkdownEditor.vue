<template>
  <MilkdownProvider>
    <MilkdownInternal 
      ref="internalRef"
      :modelValue="modelValue" 
      :editable="editable"
      @update:modelValue="emit('update:modelValue', $event)" 
    />
  </MilkdownProvider>
</template>

<script setup lang="ts">
import { defineComponent, h, watch, ref } from 'vue'
import { MilkdownProvider, Milkdown, useEditor } from '@milkdown/vue'
import { Editor, rootCtx, defaultValueCtx, editorViewOptionsCtx, editorViewCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { history } from '@milkdown/plugin-history'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { math } from '@milkdown/plugin-math'
import { diagram } from '@milkdown/plugin-diagram'
import { nord } from '@milkdown/theme-nord'
import { replaceAll, $prose } from '@milkdown/utils'
import { keymap } from '@milkdown/prose/keymap'


// Import base styles for structure (optional, but nord helps with complex nodes)
// import '@milkdown/theme-nord/style.css' -- REMOVED: Custom styles used

// Katex styles for math
import 'katex/dist/katex.min.css'

const props = defineProps<{
  modelValue: string
  editable?: boolean
}>()

const emit = defineEmits(['update:modelValue'])

const internalRef = ref<any>(null)

defineExpose({
  getEditor: () => internalRef.value?.getEditor?.()
})

// Internal component that uses useEditor (must be inside Provider)
const MilkdownInternal = defineComponent({
  name: 'MilkdownInternal',
  props: ['modelValue', 'editable'],
  emits: ['update:modelValue', 'ready'],
  setup(props, ctx) {
    // Plugin to handle Escape key -> Blur
    const escapePlugin = $prose((_ctx) => {
      return keymap({
        Escape: (_state, _dispatch, view) => {
          if (view && view.dom) {
            view.dom.blur()
            return true
          }
          return false
        }
      })
    })

    // Capture initial value ONCE to prevent useEditor from being reactive
    const initialValue = props.modelValue
    
    // Track internal content to avoid infinite loops
    const localValue = ref(initialValue)

    const { get } = useEditor((root) => {
      return Editor.make()
        .config((configCtx) => {
          configCtx.set(rootCtx, root)
          // Use captured initial value, NOT reactive props
          configCtx.set(defaultValueCtx, initialValue)
          
          // Configure editor view options
          configCtx.update(editorViewOptionsCtx, (prev) => ({
            ...prev,
            editable: () => props.editable ?? true,
          }))
          
          // Setup listener for v-model
          configCtx.get(listenerCtx).markdownUpdated((_ctx, markdown, prevMarkdown) => {
            // Check if update is echo
            if (markdown !== prevMarkdown) {
              localValue.value = markdown
              ctx.emit('update:modelValue', markdown)
            }
          })
        })
        .config(nord)
        .use(commonmark)
        .use(gfm)
        .use(history)
        .use(listener)
        .use(math)
        .use(diagram)
        .use(escapePlugin)
    })

    // Expose the editor instance getter
    ctx.expose({
      getEditor: get
    })

    // Update content when modelValue changes externally
    watch(() => props.modelValue, (newValue) => {
      if (newValue === localValue.value) return // content is same, ignore
      
      const editorInstance = get()
      if (!editorInstance) return
      localValue.value = newValue // update local to match external
      editorInstance.action(replaceAll(newValue))
    })

    // Focus helper for container click
    const focusEditor = (e?: Event) => {
      // Prevent event from bubbling to scrolling parents or triggering navigation
      if (e) {
        e.stopPropagation()
        // e.preventDefault() // Don't prevent default, we want the click to register, just focus.
      }
      
      const editorInstance = get()
      if (!editorInstance) return
      editorInstance.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        if (view && !view.hasFocus()) {
           view.focus()
        }
      })
    }

    return () => h(Milkdown, { 
      class: 'prose prose-slate dark:prose-invert max-w-none h-full outline-none',
      onClick: focusEditor
    })
  }
})
</script>

<style>
/* 
   CUSTOM MILKDOWN STYLING 
   Full control over the editor appearance via CSS
*/

.milkdown-editor-container {
  isolation: isolate;
}

/* Base Editor */
.milkdown .ProseMirror {
  padding: 2rem 1rem !important;
  min-height: 100% !important;
  outline: none !important;
  color: hsl(var(--foreground));
  background: transparent !important;
  font-family: var(--font-sans);
  line-height: 1.6;
  line-height: 1.6;
  white-space: pre-wrap !important;
  cursor: text;
}

/* Headings */
.milkdown h1 { font-size: 2.25em; font-weight: 700; margin-top: 0; margin-bottom: 0.8em; line-height: 1.1; }
.milkdown h2 { font-size: 1.875em; font-weight: 700; margin-top: 1.8em; margin-bottom: 0.8em; line-height: 1.3; }
.milkdown h3 { font-size: 1.5em; font-weight: 600; margin-top: 1.5em; margin-bottom: 0.6em; }

/* Text Elements */
.milkdown p { margin-bottom: 1.25em; }
.milkdown strong { font-weight: 600; color: hsl(var(--foreground)); }
.milkdown em { font-style: italic; }
.milkdown a { color: hsl(var(--primary)); text-decoration: underline; cursor: pointer; }
.milkdown blockquote {
  border-left: 4px solid hsl(var(--muted-foreground) / 0.3);
  padding-left: 1rem;
  font-style: italic;
  color: hsl(var(--muted-foreground));
}

/* Lists */
.milkdown ul { list-style-type: disc; padding-left: 1.625em; margin-bottom: 1.25em; }
.milkdown ol { list-style-type: decimal; padding-left: 1.625em; margin-bottom: 1.25em; }
.milkdown li { margin-bottom: 0.375em; }

/* Code Blocks & Inline Code */
.milkdown code {
  font-family: var(--font-mono);
  font-size: 0.875em;
  background-color: hsl(var(--muted));
  padding: 0.2em 0.4em;
  border-radius: 0.25rem;
}

.milkdown pre {
  background-color: hsl(var(--muted));
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin-bottom: 1.5em;
}

.milkdown pre code {
  background-color: transparent;
  padding: 0;
  color: hsl(var(--foreground));
  font-size: 0.875em;
}

/* Tables */
.milkdown table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1.5em;
}
.milkdown th, .milkdown td {
  border: 1px solid hsl(var(--border));
  padding: 0.5rem;
  text-align: left;
}
.milkdown th {
  background-color: hsl(var(--muted));
  font-weight: 600;
}

/* Selection - use browser default for visibility */
.milkdown .ProseMirror-selectednode {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}
/* Removed custom ::selection to use browser default blue */

/* Overrides for Nord Theme Artifacts */
.milkdown .icon { color: hsl(var(--foreground)); }

/* Math */
.katex-display { margin: 1.5em 0; overflow-x: auto; }
</style>
