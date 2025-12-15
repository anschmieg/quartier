
import { $prose } from '@milkdown/utils'
import { Plugin, PluginKey } from '@milkdown/prose/state'
import { Decoration, DecorationSet } from '@milkdown/prose/view'
import { Node } from '@milkdown/prose/model'
import { refractor } from 'refractor/core'
// @ts-ignore - types for refractor langs are often missing
import yaml from 'refractor/yaml'
import { frontmatterSchemaName } from './index'

// Register YAML language
refractor.register(yaml)

export const frontmatterSyntax = $prose(() => {
    return new Plugin({
        key: new PluginKey('frontmatter-syntax'),
        state: {
            init: (_, { doc }) => getDecorations(doc),
            apply: (tr, old) => {
                // Only re-calculate if document changed
                return tr.docChanged ? getDecorations(tr.doc) : old.map(tr.mapping, tr.doc)
            },
        },
        props: {
            decorations(state) {
                return this.getState(state)
            },
        },
    })
})

function getDecorations(doc: Node): DecorationSet {
    const decorations: Decoration[] = []

    doc.descendants((node, pos) => {
        if (node.type.name === frontmatterSchemaName) {
            const text = node.textContent
            if (!text) return

            try {
                // Highlight content as YAML
                const root = refractor.highlight(text, 'yaml')

                let offset = pos + 1 // Start inside the block

                const traverse = (nodes: any[]) => {
                    nodes.forEach((child) => {
                        if (child.type === 'text') {
                            offset += child.value.length
                        } else if (child.type === 'element') {
                            const start = offset
                            const className = child.properties?.className

                            if (child.children) {
                                traverse(child.children)
                            }

                            const end = offset

                            if (className && className.length > 0 && end > start) {
                                /* 
                                   Prism classes usually are 'token keyword', etc.
                                   Milkdown Prism theme styles these classes globally.
                                */
                                decorations.push(
                                    Decoration.inline(start, end, {
                                        class: className.join(' ')
                                    })
                                )
                            }
                        }
                    })
                }

                if (root.children) {
                    traverse(root.children)
                }
            } catch (e) {
                console.warn('Failed to highlight frontmatter:', e)
            }
        }
    })

    return DecorationSet.create(doc, decorations)
}
