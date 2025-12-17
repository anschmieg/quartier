<template>
  <MilkdownProvider>
    <ProsemirrorAdapterProvider>
      <MilkdownInternal 
        ref="internalRef"
        :modelValue="modelValue" 
        :editable="editable"
        :roomId="roomId"
        :userEmail="userEmail"
        :showComments="showComments"
        @update:modelValue="emit('update:modelValue', $event)" 
      />
    </ProsemirrorAdapterProvider>
  </MilkdownProvider>
</template>

<script setup lang="ts">
import { defineComponent, h, watch, ref, shallowRef, onBeforeUnmount } from 'vue'
import { MilkdownProvider, Milkdown, useEditor } from '@milkdown/vue'
import { useNodeViewFactory, ProsemirrorAdapterProvider } from '@prosemirror-adapter/vue'
import { Editor, rootCtx, defaultValueCtx, editorViewOptionsCtx, editorViewCtx, parserCtx } from '@milkdown/kit/core'
import { commonmark, codeBlockSchema } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { history } from '@milkdown/plugin-history'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { math } from '@milkdown/plugin-math'
import { diagram } from '@milkdown/plugin-diagram'
import { nord } from '@milkdown/theme-nord'
import { $prose, $view, $remark } from '@milkdown/utils'
import { keymap } from '@milkdown/prose/keymap'
// @ts-ignore
import remarkDirective from 'remark-directive'
// COLLAB DISABLED: import { collab, collabServiceCtx } from '@milkdown/plugin-collab'
import { prism, prismConfig } from '@milkdown/plugin-prism'
import r from 'refractor/r'
import python from 'refractor/python'
import julia from 'refractor/julia'
import bash from 'refractor/bash'
import sql from 'refractor/sql'
import yaml from 'refractor/yaml'
import toml from 'refractor/toml'
import javascript from 'refractor/javascript'
import typescript from 'refractor/typescript'
import css from 'refractor/css'
import markdown from 'refractor/markdown'
import json from 'refractor/json'
import java from 'refractor/java'
import c from 'refractor/c'
import cpp from 'refractor/cpp'
import go from 'refractor/go'
import rust from 'refractor/rust'
import lua from 'refractor/lua'
import ruby from 'refractor/ruby'
import latex from 'refractor/latex'
import mermaid from 'refractor/mermaid'
import dot from 'refractor/dot'
import scala from 'refractor/scala'
import { emoji } from '@milkdown/plugin-emoji'
import { indent } from '@milkdown/plugin-indent'
import { upload, uploadConfig } from '@milkdown/plugin-upload'
import { remarkFrontmatterPlugin, frontmatterNode, frontmatterSyntax, frontmatterValidation } from './plugins/frontmatter'
import { createCompletionPlugin, type CompletionState, type CompletionItem } from './plugins/frontmatter/completion-plugin'
import { commentPlugin, commentNode, commentInputRule } from './plugins/html-comment'
import CommentNode from './plugins/html-comment/CommentNode.vue'
import FrontmatterCompletion from './plugins/frontmatter/FrontmatterCompletion.vue'
import FrontmatterNode from './plugins/frontmatter/FrontmatterNode.vue'
import CodeCell from './CodeCell.vue'
import { calloutNode, calloutInputRule } from './plugins/callout'
import CalloutNode from './plugins/callout/CalloutNode.vue'
import './plugins/frontmatter/style.css'
import { useCollab, getCollabPlugins } from '@/composables/useCollab'
import { convertQuartoToMilkdown, convertMilkdownToQuarto } from '@/utils/quarto-syntax'


// Import base styles for structure (optional, but nord helps with complex nodes)
// import '@milkdown/theme-nord/style.css' -- REMOVED: Custom styles used

// Katex styles for math
import 'katex/dist/katex.min.css'

const props = defineProps<{
  modelValue: string
  editable?: boolean
  roomId?: string // For collaboration: unique room ID (e.g., 'quartier:owner/repo/path')
  userEmail?: string // For cursor presence
  enableCollab?: boolean // Conditionally enable collaboration
  showComments?: boolean
}>()

const emit = defineEmits(['update:modelValue'])

const internalRef = ref<any>(null)

defineExpose({
  getEditor: () => internalRef.value?.getEditor?.()
})

// Internal component that uses useEditor (must be inside Provider)
const MilkdownInternal = defineComponent({
  name: 'MilkdownInternal',
  props: ['modelValue', 'editable', 'roomId', 'userEmail', 'enableCollab', 'showComments'],
  emits: ['update:modelValue', 'ready'],
  setup(props, ctx) {
    // COLLAB DISABLED: Yjs document and providers for collaboration
    // let ydoc: Y.Doc | null = null
    // let partyProvider: YPartyKitProvider | null = null
    
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
    // Convert Quarto syntax (::: {.callout}) to Milkdown syntax (:::callout)
    const initialValue = convertQuartoToMilkdown(props.modelValue)
    
    // Track internal content to avoid infinite loops
    const localValue = ref(initialValue)

    // --- Frontmatter Completion ---
    const completionState = shallowRef<CompletionState>({
        active: false,
        items: [],
        index: 0,
        coords: null,
        query: '',
        range: null
    })

    const onCompletionUpdate = (newState: CompletionState) => {
        completionState.value = newState
    }
    
    const onCompletionSelect = (item: CompletionItem) => {
        const editorInstance = get()
        if (!editorInstance) return

        editorInstance.action(ctx => {
            const view = ctx.get(editorViewCtx)
            const range = completionState.value.range
            if (range) {
                const tr = view.state.tr.insertText(item.insertText || item.label, range.from, range.to)
                view.dispatch(tr)
                view.focus()
            }
        })
        completionState.value = { ...completionState.value, active: false }
    }

    const nodeViewFactory = useNodeViewFactory()

    // Create the View Plugin here, so it's available for .use()
    const frontmatterView = $view(frontmatterNode.node, () => nodeViewFactory({
        component: FrontmatterNode 
    }))

    // Create executable code view for code blocks
    // The CodeCell component checks the language and renders appropriately
    const executableCodeView = $view(codeBlockSchema.node, () => nodeViewFactory({
        component: CodeCell,
        as: 'div',
    }))

    // Create callout view for ::: {.callout-*} blocks
    const calloutView = $view(calloutNode.node, () => nodeViewFactory({
        component: CalloutNode,
        as: 'div',
    }))

    // Create comment view
    // Create comment view
    const commentView = $view(commentNode.node, () => nodeViewFactory({
        component: CommentNode,
    }))

    // Editor instance
    const { get } = useEditor((root) => {
      const editor = Editor.make()
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
              // Convert back to Quarto syntax before emitting
              ctx.emit('update:modelValue', convertMilkdownToQuarto(markdown))
            }
          })

          // Configure upload plugin
          configCtx.update(uploadConfig.key, (prev) => ({
             ...prev,
             uploader: async (files, _schema) => {
               const images: any[] = []
               
               for (let i = 0; i < files.length; i++) {
                 const file = files.item(i)
                 if (!file) continue
                 
                 // Placeholder: return a fake URL for now as we don't have a backend storage yet
                 // In a real app, this would upload to R2/S3 and return the URL
                 console.log('[Upload] Mock upload for:', file.name)
                 
                 images.push({
                   url: 'https://placehold.co/600x400?text=' + encodeURIComponent(file.name),
                   alt: file.name,
                 })
               }
               
               return images
             }
          }))
        })
        .config(nord)
        .use(commonmark)
        .use(remarkFrontmatterPlugin)
        .use(frontmatterNode)
        .use(frontmatterView)
        .use(frontmatterSyntax)
        .use(frontmatterValidation)
        .use(createCompletionPlugin(onCompletionUpdate, onCompletionSelect))
        .use(executableCodeView)
        .use($remark('remark-directive', () => remarkDirective))
        .use(calloutNode)
        .use(calloutInputRule)
        .use(calloutView)
        .use(commentPlugin)
        .use(commentNode)
        .use(commentInputRule)
        .use(commentView)
        .use(gfm)
        .use(history)
        .use(listener)
        .use(math)
        .use(diagram)
        .config((ctx) => {
          ctx.set(prismConfig.key, {
            configureRefractor: (refractor) => {
              refractor.register(r)
              refractor.register(python)
              refractor.register(julia)
              refractor.register(bash)
              refractor.register(sql)
              refractor.register(yaml)
              refractor.register(toml)
              refractor.register(javascript)
              refractor.register(typescript)
              refractor.register(css)
              refractor.register(markdown)
              refractor.register(json)
              refractor.register(java)
              refractor.register(c)
              refractor.register(cpp)
              refractor.register(go)
              refractor.register(rust)
              refractor.register(lua)
              refractor.register(ruby)
              refractor.register(latex)
              // mermaid might conflict if not handled carefully, but registering it for Prism is usually safe
              refractor.register(mermaid) 
              refractor.register(dot)
              refractor.register(scala)
              
              // Map Quarto style "{r}" to "r"
              refractor.alias({
                'r': ['{r}'],
                'python': ['{python}', '{py}'],
                'julia': ['{julia}', '{jl}'],
                'bash': ['{bash}', '{sh}'],
                'sql': ['{sql}'],
                'yaml': ['{yaml}'],
                'toml': ['{toml}'],
                'javascript': ['{ojs}', '{javascript}', '{js}'], // Map ojs to js
                'typescript': ['{typescript}', '{ts}', 'ts'],
                'css': ['{css}'],
                'markdown': ['{markdown}', '{md}'],
                'json': ['{json}'],
                'java': ['{java}'],
                'c': ['{c}'],
                'cpp': ['{cpp}', '{c++}'],
                'go': ['{go}'],
                'rust': ['{rust}'],
                'lua': ['{lua}'],
                'ruby': ['{ruby}', '{rb}']
              })
            }
          })
        })
        .use(prism)
        .use(emoji)
        .use(indent)
        .use(upload)
        .use(escapePlugin)

        // Add collaboration plugins (conditionally enabled via useCollab)
        getCollabPlugins().forEach(plugin => editor.use(plugin))
        
        return editor
    })

    // Initialize collaboration logic (conditionally enabled via useCollab)
    // This handles Yjs doc, PartyKit connection, and awareness
    useCollab(props.roomId, props.userEmail, get, initialValue, () => props.enableCollab ?? false)

    // Expose the editor instance getter
    ctx.expose({
      getEditor: get
    })

    // Track unmount state to prevent watcher firing during destruction
    const isUnmounted = ref(false)
    onBeforeUnmount(() => {
        isUnmounted.value = true
    })

    // Update content when modelValue changes externally
    watch(() => props.modelValue, (newValue) => {
      if (isUnmounted.value) return
      
      const convertedValue = convertQuartoToMilkdown(newValue)
      
      if (convertedValue === localValue.value) {
        return // content is same, ignore
      }
      
      const editor = get()
      if (!editor) return

      localValue.value = convertedValue
      
      editor.action((ctx) => {
          const view = ctx.get(editorViewCtx)
          const parser = ctx.get(parserCtx)
          const doc = parser(convertedValue)
          if (!doc) return
          
          const state = view.state
          view.dispatch(state.tr.replaceWith(0, state.doc.content.size, doc))
      })
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

    return () => h('div', {
      class: ['h-full w-full relative milkdown-container', props.showComments === false ? 'hide-comments' : ''],
      onClick: focusEditor
    }, [
      h(Milkdown),
      h(FrontmatterCompletion, {
        state: completionState.value,
        onSelect: onCompletionSelect
      })
    ])
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

/* Toggle Comments */
.hide-comments [data-type="comment"] {
  display: none !important;
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

/* Prism Syntax Highlighting (Nord-like) */
.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
  color: #616e88;
}

.token.punctuation {
  color: #81a1c1;
}

.token.namespace {
  opacity: 0.7;
}

.token.property,
.token.tag,
.token.constant,
.token.symbol,
.token.deleted {
  color: #81a1c1;
}

.token.number {
  color: #b48ead;
}

.token.boolean {
  color: #81a1c1;
}

.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.inserted {
  color: #a3be8c;
}

.token.operator,
.token.entity,
.token.url,
.language-css .token.string,
.style .token.string,
.token.variable {
  color: #81a1c1;
}

.token.atrule,
.token.attr-value,
.token.function,
.token.class-name {
  color: #88c0d0;
}

.token.keyword {
  color: #81a1c1;
}

.token.regex,
.token.important {
  color: #ebcb8b;
}

.token.important,
.token.bold {
  font-weight: bold;
}

.token.italic {
  font-style: italic;
}

.token.entity {
  cursor: help;
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

.milkdown .ProseMirror-selectednode {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

/* Overrides for Nord Theme Artifacts */
.milkdown .icon { color: hsl(var(--foreground)); }

/* Math */
.katex-display { margin: 1.5em 0; overflow-x: auto; }

/* Callout Counters Reset */
.milkdown {
  counter-reset: callout-tip callout-nte callout-wrn callout-imp callout-cau;
}
</style>
