/**
 * Quarto Callout Plugin for Milkdown
 * 
 * Uses input rules to detect :::callout-<type> syntax and create callout nodes
 * in real-time during WYSIWYG editing.
 */

import { $nodeSchema, $inputRule } from '@milkdown/utils'
import { InputRule } from '@milkdown/prose/inputrules'
import { Selection } from '@milkdown/prose/state'
import type { Node } from '@milkdown/prose/model'

// Callout types supported by Quarto
export const CALLOUT_TYPES = ['note', 'warning', 'important', 'tip', 'caution'] as const
export type CalloutType = typeof CALLOUT_TYPES[number]

// Callout node name
export const calloutNodeName = 'callout'

/**
 * Milkdown schema for callout nodes
 */
export const calloutNode = $nodeSchema(calloutNodeName, () => ({
  group: 'block',
  content: 'block+',
  defining: true,
  attrs: {
    type: { default: 'note' },
    title: { default: '' },
    collapse: { default: '' },
    appearance: { default: 'default' },
    icon: { default: 'true' },
  },
  parseDOM: [
    {
      tag: 'div.callout',
      getAttrs: (dom: HTMLElement) => ({
        type: dom.getAttribute('data-callout-type') || 'note',
        title: dom.getAttribute('data-callout-title') || '',
        collapse: dom.getAttribute('data-callout-collapse') || '',
        appearance: dom.getAttribute('data-callout-appearance') || 'default',
        icon: dom.getAttribute('data-callout-icon') || 'true',
      }),
    },
  ],
  toDOM: (node: Node) => [
    'div',
    {
      class: `callout callout-${node.attrs.type}`,
      'data-callout-type': node.attrs.type,
      'data-callout-title': node.attrs.title,
      'data-callout-collapse': node.attrs.collapse,
      'data-callout-appearance': node.attrs.appearance,
      'data-callout-icon': node.attrs.icon,
    },
    0,
  ],
  // Parse when loading markdown with callout syntax
  parseMarkdown: {
    match: (node: any) => {
      // Match container directives with callout- prefix
      if (node.type === 'containerDirective' && node.name?.startsWith('callout-')) {
        return true
      }
      return false
    },
    runner: (state: any, node: any, type: any) => {
      const calloutType = node.name?.replace('callout-', '') || 'note'
      const attrs = {
        type: CALLOUT_TYPES.includes(calloutType as CalloutType) ? calloutType : 'note',
        title: node.attributes?.title || '',
        collapse: node.attributes?.collapse || '',
        appearance: node.attributes?.appearance || 'default',
        icon: node.attributes?.icon !== 'false' ? 'true' : 'false',
      }
      state.openNode(type, attrs)
      state.next(node.children)
      state.closeNode()
    },
  },
  // Serialize to markdown
  toMarkdown: {
    match: (node: Node) => node.type.name === calloutNodeName,
    runner: (state: any, node: Node) => {
      const calloutType = node.attrs.type || 'note'
      const attrs: Record<string, string> = {}
      if (node.attrs.title) attrs.title = node.attrs.title
      if (node.attrs.collapse) attrs.collapse = node.attrs.collapse
      if (node.attrs.appearance && node.attrs.appearance !== 'default') attrs.appearance = node.attrs.appearance
      if (node.attrs.icon === 'false') attrs.icon = 'false'

      state.openNode('containerDirective', undefined, {
        name: `callout-${calloutType}`,
        attributes: attrs,
      })
      state.next(node.content)
      state.closeNode()
    },
  },
}))

/**
 * Input rule to detect :::callout-<type> and create a callout block
 * Triggers when user types ":::callout-note " (with trailing space) at start of line
 */
export const calloutInputRule = $inputRule(() => {
  console.log('[Callout] Input rule created')
  return new InputRule(
    // Match :::callout-<type> at start of line, optionally with attributes
    /^:::callout-(note|warning|important|tip|caution)(?:\s+|$)/,
    (state, match, start, end) => {
      console.log('[Callout] Input rule matched:', match[0], 'at', start, '-', end)
      const [, type] = match
      const { tr, schema } = state

      // Get the callout node type
      const calloutNodeType = schema.nodes[calloutNodeName]
      if (!calloutNodeType) {
        console.error('[Callout] Node type not found in schema')
        return null
      }

      // Create a paragraph to hold initial content
      const paragraph = schema.nodes.paragraph?.create()
      if (!paragraph) {
        console.error('[Callout] Paragraph node not found')
        return null
      }

      // Create the callout node with the matched type
      const callout = calloutNodeType.create(
        { type: type as CalloutType },
        paragraph
      )

      // Replace the matched text with the callout node
      // Start from the beginning of the line
      const $start = state.doc.resolve(start)
      const lineStart = $start.start()

      tr.replaceWith(lineStart, end, callout)

      // Position cursor inside the callout's paragraph
      // The callout starts at lineStart, and the paragraph is its first child
      // We want to place cursor at the start of the paragraph content
      // callout structure: callout > paragraph > text
      // Position is: lineStart + 1 (enter callout) + 1 (enter paragraph)
      const cursorPos = lineStart + 2
      tr.setSelection(Selection.near(tr.doc.resolve(cursorPos)))

      console.log('[Callout] Created callout node:', type, 'cursor at:', cursorPos)
      return tr
    }
  )
})

