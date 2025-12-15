<template>
  <MilkdownProvider>
    <ProsemirrorAdapterProvider>
      <MilkdownInternal 
        ref="internalRef"
        :modelValue="modelValue" 
        :editable="editable"
        :roomId="roomId"
        :userEmail="userEmail"
        @update:modelValue="emit('update:modelValue', $event)" 
      />
    </ProsemirrorAdapterProvider>
  </MilkdownProvider>
</template>

<script setup lang="ts">
import { defineComponent, h, watch, watchEffect, ref, shallowRef, onUnmounted } from 'vue'
import { MilkdownProvider, Milkdown, useEditor } from '@milkdown/vue'
import { useNodeViewFactory, ProsemirrorAdapterProvider } from '@prosemirror-adapter/vue'
import { Editor, rootCtx, defaultValueCtx, editorViewOptionsCtx, editorViewCtx } from '@milkdown/kit/core'
import { commonmark, codeBlockSchema } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { history } from '@milkdown/plugin-history'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { math } from '@milkdown/plugin-math'
import { diagram } from '@milkdown/plugin-diagram'
import { nord } from '@milkdown/theme-nord'
import { replaceAll, $prose, $view } from '@milkdown/utils'
import { keymap } from '@milkdown/prose/keymap'
import { collab, collabServiceCtx } from '@milkdown/plugin-collab'
import { prism } from '@milkdown/plugin-prism'
import { emoji } from '@milkdown/plugin-emoji'
import { indent } from '@milkdown/plugin-indent'
import { upload, uploadConfig } from '@milkdown/plugin-upload'
import { remarkFrontmatterPlugin, frontmatterNode, frontmatterSyntax, frontmatterValidation } from './plugins/frontmatter'
import { createCompletionPlugin, type CompletionState, type CompletionItem } from './plugins/frontmatter/completion-plugin'
import FrontmatterCompletion from './plugins/frontmatter/FrontmatterCompletion.vue'
import FrontmatterNode from './plugins/frontmatter/FrontmatterNode.vue'
import CodeCell from './CodeCell.vue'
import './plugins/frontmatter/style.css'
import * as Y from 'yjs'
import YPartyKitProvider from 'y-partykit/provider'
import { IndexeddbPersistence } from 'y-indexeddb'
import { updateAwarenessState, clearAwarenessState } from '@/composables/useAwareness'


// Import base styles for structure (optional, but nord helps with complex nodes)
// import '@milkdown/theme-nord/style.css' -- REMOVED: Custom styles used

// Katex styles for math
import 'katex/dist/katex.min.css'

const props = defineProps<{
  modelValue: string
  editable?: boolean
  roomId?: string // For collaboration: unique room ID (e.g., 'quartier:owner/repo/path')
  userEmail?: string // For cursor presence
}>()

const emit = defineEmits(['update:modelValue'])

const internalRef = ref<any>(null)

defineExpose({
  getEditor: () => internalRef.value?.getEditor?.()
})

// Internal component that uses useEditor (must be inside Provider)
const MilkdownInternal = defineComponent({
  name: 'MilkdownInternal',
  props: ['modelValue', 'editable', 'roomId', 'userEmail'],
  emits: ['update:modelValue', 'ready'],
  setup(props, ctx) {
    // Yjs document and providers for collaboration
    let ydoc: Y.Doc | null = null
    // let webrtcProvider: WebrtcProvider | null = null // Replaced by PartyKit
    let partyProvider: YPartyKitProvider | null = null
    let idbProvider: IndexeddbPersistence | null = null
    
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
    
    // Track pending content that arrives before editor is ready
    const pendingContent = ref<string | null>(null)

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
        .use(gfm)
        .use(history)
        .use(listener)
        .use(math)
        .use(diagram)
        .use(prism)
        .use(emoji)
        .use(indent)
        .use(upload)
        .use(escapePlugin)
        .use(collab)
    })

    // Setup collaboration after editor is ready
    watchEffect(() => {
      const editor = get()
      if (!editor || !props.roomId) return
      
      // Create Yjs document if not exists
      if (!ydoc) {
        ydoc = new Y.Doc()
        
        // Setup IndexedDB persistence (local offline storage)
        idbProvider = new IndexeddbPersistence(props.roomId, ydoc)
        console.log('[Collab] IndexedDB connected:', props.roomId)
        
        // Setup PartyKit provider (WebSocket signaling)
        // Uses local server in dev (localhost:1999) and deployed server in prod
        const host = import.meta.env.DEV ? 'localhost:1999' : 'quartier-collab.partykit.dev'
        
        partyProvider = new YPartyKitProvider(
          host,
          props.roomId,
          ydoc,
          {
            connect: false, // Wait for IndexedDB sync
          }
        )
        
        // Set user awareness for cursor presence
        if (props.userEmail) {
          const hue = props.userEmail.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % 360
          partyProvider.awareness.setLocalStateField('user', {
            name: props.userEmail.split('@')[0],
            email: props.userEmail,
            color: `hsl(${hue}, 70%, 50%)`,
          })
        }
        console.log('[Collab] PartyKit initialized:', host)
        
        // Listen for awareness changes and update global store
        partyProvider.awareness.on('change', () => {
             updateAwarenessState(
               partyProvider!.awareness.getStates(),
               partyProvider!.awareness.clientID
             )
        })
        
        // Initial awareness update
        updateAwarenessState(
          partyProvider.awareness.getStates(),
          partyProvider.awareness.clientID
        )
        
        // Wait for IndexedDB to sync before connecting collab service
        idbProvider.whenSynced.then(() => {
          console.log('[Collab] IndexedDB synced, connecting collab service...')
          
          try {
            editor.action((ctx) => {
              const collabService = ctx.get(collabServiceCtx)
              collabService
                .bindDoc(ydoc!)
                .setAwareness(partyProvider!.awareness)
                .connect()
              
              // Connect PartyKit provider to start syncing
              partyProvider!.connect()
              console.log('[Collab] PartyKit connected')

              // Apply initial content if Yjs doc is empty
              // This uses the editor's current content (from the file) as the template
              collabService.applyTemplate(initialValue)
            })
            console.log('[Collab] Editor connected to Yjs')
          } catch (error) {
            console.error('[Collab] Failed to connect:', error)
          }
        })
      }
    })

    // Cleanup on unmount
    onUnmounted(() => {
      if (partyProvider) {
        partyProvider.destroy()
      }
      if (idbProvider) {
        idbProvider.destroy()
        idbProvider = null
      }
      if (ydoc) {
        ydoc.destroy()
        ydoc = null
      }
      clearAwarenessState()
      console.log('[Collab] Cleanup complete')
    })

    // Expose the editor instance getter
    ctx.expose({
      getEditor: get
    })

    // Update content when modelValue changes externally
    watch(() => props.modelValue, (newValue) => {
      if (newValue === localValue.value) {
        return // content is same, ignore
      }
      
      const editorInstance = get()
      if (!editorInstance) {
        // Editor not ready yet, store for later
        console.log('[MilkdownEditor] Editor not ready, storing pending content')
        pendingContent.value = newValue
        return
      }
      
      localValue.value = newValue
      editorInstance.action(replaceAll(newValue))
      console.log('[MilkdownEditor] Called replaceAll with new content')
    })

    // Apply pending content once editor is ready
    watchEffect(() => {
      const editorInstance = get()
      if (editorInstance && pendingContent.value !== null) {
        console.log('[MilkdownEditor] Applying pending content')
        localValue.value = pendingContent.value
        editorInstance.action(replaceAll(pendingContent.value))
        pendingContent.value = null // Clear pending
      }
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

    return () => h('div', { class: 'h-full w-full relative' }, [
      h(Milkdown, { 
        class: 'prose prose-slate dark:prose-invert max-w-none h-full outline-none',
        onClick: focusEditor
      }),
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
</style>
