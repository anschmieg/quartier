import { Plugin, PluginKey } from '@milkdown/prose/state'
import { $prose, $nodeSchema, $remark } from '@milkdown/utils'
import remarkCite from '@benrbray/remark-cite'
import { simpleCitePlugin } from './simple-cite'

export const citationPluginKey = new PluginKey('citation-plugin')

export interface CitationTriggerEvent {
    coords: { x: number, y: number };
    query: string;
}

// 1. Define Citation Node Schema
export const citationNode = $nodeSchema('citation', () => ({
    atom: true,
    inline: true,
    group: 'inline',
    attrs: {
        items: { default: [] }
    },
    parseDOM: [
        {
            tag: 'span[data-type="citation"]',
            getAttrs: (dom) => {
                if (!(dom instanceof HTMLElement)) return {}
                return { items: JSON.parse(dom.getAttribute('data-items') || '[]') }
            }
        }
    ],
    toDOM: (node) => {
        return ['span', {
            'data-type': 'citation',
            'data-items': JSON.stringify(node.attrs.items),
            class: 'citation-node'
        }, 0] // 0 means render content via NodeView? Atom has no content.
    },
    parseMarkdown: {
        match: (node) => {
             if (node.type === 'cite') console.log('[Milkdown Citation] Matched cite node:', node)
             return node.type === 'cite'
        },
        runner: (state, node, type) => {
            console.log('[Milkdown Citation] Running parser for:', node)
            const data = node.data as { citeItems?: Array<{ key?: string; id?: string }> } | undefined
            state.addNode(type, {
                items: data?.citeItems || []
            })
        }
    },
    toMarkdown: {
        match: node => node.type.name === 'citation',
        runner: (state, node) => {
            state.addNode('cite', undefined, undefined, {
                data: {
                    citeItems: node.attrs.items
                }
            })
        }
    }
}))

export const remarkCitationPlugin = $remark('remark-citation', () => remarkCite as any)
export const remarkSimpleCitePlugin = $remark('remark-simple-cite', () => simpleCitePlugin)

// 3. Trigger Plugin (Existing)
export const useCitationTriggerPlugin = (onTrigger: (e: CitationTriggerEvent) => void, onDismiss: () => void) => {
    return $prose(() => {
        return new Plugin({
            key: citationPluginKey,
            props: {
                handleTextInput(view, from, _to, text) {
                    if (text === '@') {
                        // Check if previous char was '['
                        const prevChar = view.state.doc.textBetween(from - 1, from)
                        if (prevChar === '[') {
                            const coords = view.coordsAtPos(from)
                            onTrigger({
                                coords: { x: coords.left, y: coords.bottom },
                                query: ''
                            })
                            // Proceed with default behavior (inserting @)
                        }
                    } else if (text === ']') {
                         onDismiss()
                    }
                    return false
                },
                handleKeyDown(_view, event) {
                    if (event.key === 'Escape') {
                        onDismiss()
                    }
                    return false
                }
            }
        })
    })
}
