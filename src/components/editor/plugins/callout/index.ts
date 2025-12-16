/**
 * Quarto Callout Plugin for Milkdown
 * 
 * Parses ::: {.callout-<type>} syntax (fenced divs) and renders them
 * as styled callout blocks with icon, title, and collapsible content.
 */

import { $nodeSchema, $remark } from '@milkdown/utils'
import type { Node } from '@milkdown/prose/model'
import remarkDirective from 'remark-directive'
import { visit } from 'unist-util-visit'

// Callout types supported by Quarto
export const CALLOUT_TYPES = ['note', 'warning', 'important', 'tip', 'caution'] as const
export type CalloutType = typeof CALLOUT_TYPES[number]

// Callout node name
export const calloutNodeName = 'callout'

/**
 * Remark plugin to transform containerDirective nodes with callout classes
 * into our custom callout nodes
 */
function remarkCalloutPlugin() {
    return (tree: any) => {
        visit(tree, (node: any) => {
            // Look for containerDirective (:::) nodes
            if (node.type === 'containerDirective' || node.type === 'leafDirective') {
                // Check if it's a callout (name starts with callout-)
                const name = node.name || ''

                // Handle both ::: callout-note and ::: {.callout-note}
                let calloutType: string | null = null

                if (name.startsWith('callout-')) {
                    calloutType = name.replace('callout-', '')
                } else if (node.attributes?.class) {
                    const classes = node.attributes.class.split(' ')
                    const calloutClass = classes.find((c: string) => c.startsWith('callout-'))
                    if (calloutClass) {
                        calloutType = calloutClass.replace('callout-', '')
                    }
                }

                if (calloutType && CALLOUT_TYPES.includes(calloutType as CalloutType)) {
                    // Transform to our callout node
                    node.type = 'callout'
                    node.data = {
                        hName: 'div',
                        hProperties: {
                            class: `callout callout-${calloutType}`,
                            'data-callout-type': calloutType,
                            'data-callout-title': node.attributes?.title || '',
                            'data-callout-collapse': node.attributes?.collapse || 'false',
                        }
                    }
                }
            }
        })
    }
}

/**
 * Remark plugin integration for Milkdown
 */
export const remarkCallout = $remark('remarkCallout', () => remarkDirective)
export const remarkCalloutTransform = $remark('remarkCalloutTransform', () => remarkCalloutPlugin)

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
    parseMarkdown: {
        match: ({ type }: any) => type === 'callout',
        runner: (state: any, node: any, type: any) => {
            const attrs = {
                type: node.data?.hProperties?.['data-callout-type'] || 'note',
                title: node.data?.hProperties?.['data-callout-title'] || '',
                collapse: node.data?.hProperties?.['data-callout-collapse'] || 'false',
            }
            state.openNode(type, attrs)
            state.next(node.children)
            state.closeNode()
        },
    },
    toMarkdown: {
        match: (node: Node) => node.type.name === calloutNodeName,
        runner: (state: any, node: Node) => {
            const type = node.attrs.type || 'note'
            const title = node.attrs.title
            const collapse = node.attrs.collapse

            // Build attributes string
            let attrs = `.callout-${type}`
            if (title) attrs += ` title="${title}"`
            if (collapse === 'true') attrs += ` collapse="true"`

            state.openNode('containerDirective', undefined, { name: '', attributes: { class: `callout-${type}` } })
            state.next(node.content)
            state.closeNode()
        },
    },
}))

/**
 * CSS styles for callouts
 */
export const calloutStyles = `
.callout {
  border-radius: 0.5rem;
  padding: 1rem;
  margin: 1rem 0;
  border-left: 4px solid;
}

.callout-note {
  background-color: hsl(210 100% 97%);
  border-left-color: hsl(210 100% 50%);
}

.callout-warning {
  background-color: hsl(45 100% 96%);
  border-left-color: hsl(45 100% 50%);
}

.callout-important {
  background-color: hsl(0 100% 97%);
  border-left-color: hsl(0 100% 50%);
}

.callout-tip {
  background-color: hsl(142 100% 97%);
  border-left-color: hsl(142 100% 40%);
}

.callout-caution {
  background-color: hsl(30 100% 96%);
  border-left-color: hsl(30 100% 50%);
}

.dark .callout-note {
  background-color: hsl(210 50% 15%);
}

.dark .callout-warning {
  background-color: hsl(45 50% 15%);
}

.dark .callout-important {
  background-color: hsl(0 50% 15%);
}

.dark .callout-tip {
  background-color: hsl(142 50% 15%);
}

.dark .callout-caution {
  background-color: hsl(30 50% 15%);
}
`
