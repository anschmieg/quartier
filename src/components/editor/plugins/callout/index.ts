/**
 * Quarto Callout Plugin for Milkdown
 * 
 * Parses ::: {.callout-<type>} syntax (fenced divs) and renders them
 * as styled callout blocks with icon, title, and collapsible content.
 * 
 * Based on Milkdown iframe plugin example pattern.
 */

import { $nodeSchema, $remark } from '@milkdown/utils'
import remarkDirective from 'remark-directive'
import type { Node } from '@milkdown/prose/model'

// Callout types supported by Quarto
export const CALLOUT_TYPES = ['note', 'warning', 'important', 'tip', 'caution'] as const
export type CalloutType = typeof CALLOUT_TYPES[number]

// Callout node name
export const calloutNodeName = 'callout'

/**
 * Helper to extract callout type from directive name or class
 */
function extractCalloutType(node: any): CalloutType | null {
  const name = node.name || ''

  // Handle ::: callout-note
  if (name.startsWith('callout-')) {
    const type = name.replace('callout-', '') as CalloutType
    if (CALLOUT_TYPES.includes(type)) return type
  }

  // Handle ::: {.callout-note} 
  if (node.attributes?.class) {
    const classes = String(node.attributes.class).split(' ')
    for (const c of classes) {
      if (c.startsWith('callout-')) {
        const type = c.replace('callout-', '') as CalloutType
        if (CALLOUT_TYPES.includes(type)) return type
      }
    }
  }

  return null
}

/**
 * Remark plugin integration for Milkdown
 * Just register remark-directive - we match in parseMarkdown
 */
export const remarkCalloutDirective = $remark('remarkCalloutDirective', () => remarkDirective)

/**
 * Milkdown schema for callout nodes
 * Following the iframe plugin pattern from Milkdown docs
 */
export const calloutNode = $nodeSchema(calloutNodeName, () => ({
  group: 'block',
  content: 'block+',
  defining: true,
  attrs: {
    type: { default: 'note' },
    title: { default: '' },
    collapse: { default: 'false' },
  },
  parseDOM: [
    {
      tag: 'div.callout',
      getAttrs: (dom: HTMLElement) => ({
        type: dom.getAttribute('data-callout-type') || 'note',
        title: dom.getAttribute('data-callout-title') || '',
        collapse: dom.getAttribute('data-callout-collapse') || 'false',
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
    },
    0,
  ],
  // Match containerDirective nodes that have callout class/name
  parseMarkdown: {
    match: (node: any) => {
      if (node.type !== 'containerDirective') return false
      return extractCalloutType(node) !== null
    },
    runner: (state: any, node: any, type: any) => {
      const calloutType = extractCalloutType(node) || 'note'
      const attrs = {
        type: calloutType,
        title: node.attributes?.title || '',
        collapse: node.attributes?.collapse || 'false',
      }
      state.openNode(type, attrs)
      state.next(node.children)
      state.closeNode()
    },
  },
  // Serialize back to containerDirective
  toMarkdown: {
    match: (node: Node) => node.type.name === calloutNodeName,
    runner: (state: any, node: Node) => {
      const calloutType = node.attrs.type || 'note'
      const attrs: Record<string, string> = {}
      if (node.attrs.title) attrs.title = node.attrs.title
      if (node.attrs.collapse === 'true') attrs.collapse = 'true'

      state.openNode('containerDirective', undefined, {
        name: `callout-${calloutType}`,
        attributes: attrs,
      })
      state.next(node.content)
      state.closeNode()
    },
  },
}))
