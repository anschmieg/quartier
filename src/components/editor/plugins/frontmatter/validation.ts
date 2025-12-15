
import { $prose } from '@milkdown/utils'
import { Plugin, PluginKey } from '@milkdown/prose/state'
import { Decoration, DecorationSet } from '@milkdown/prose/view'
import { Node } from '@milkdown/prose/model'
import YAML from 'yaml'
import Ajv from 'ajv'
import quartoSchema from './quarto-schema.json'

const frontmatterSchemaName = 'frontmatter'

const ajv = new Ajv({ strict: false, allErrors: true })
const validate = ajv.compile(quartoSchema)

export const frontmatterValidation = $prose(() => {
    return new Plugin({
        key: new PluginKey('frontmatter-validation'),
        state: {
            init: (_, { doc }) => getValidationDecorations(doc),
            apply: (tr, old) => {
                return tr.docChanged ? getValidationDecorations(tr.doc) : old.map(tr.mapping, tr.doc)
            },
        },
        props: {
            decorations(state) {
                return this.getState(state)
            },
        },
    })
})

function getValidationDecorations(doc: Node): DecorationSet {
    const decorations: Decoration[] = []

    doc.descendants((node, pos) => {
        if (node.type.name === frontmatterSchemaName) {
            const text = node.textContent
            if (!text || !text.trim()) return

            try {
                // Parse with YAML to get CST/Ranges
                const yamlDoc = YAML.parseDocument(text)
                const jsonContent = yamlDoc.toJSON()

                // Validate
                const valid = validate(jsonContent)

                if (!valid && validate.errors) {
                    const offset = pos + 1 // Start inside the block

                    validate.errors.forEach(err => {
                        // Map error path to range
                        // err.instancePath is "/key/subkey"
                        const path = err.instancePath.split('/').filter(p => p)
                        let range: [number, number] | null = null

                        if (err.keyword === 'additionalProperties') {
                            // For unknown keys, instancePath is empty, key is in params
                            const key = err.params.additionalProperty
                            const contents = yamlDoc.contents as any
                            const node = contents?.items?.find((item: any) => item.key && item.key.value === key)
                            if (node && node.key && node.key.range) {
                                range = [node.key.range[0], node.key.range[1]]
                            }
                        } else if (path.length > 0) {
                            // Find the node in the YAML CST
                            let current: any = yamlDoc.contents
                            for (const key of path) {
                                if (current && current.items) {
                                    const found = current.items.find((item: any) => item.key && item.key.value === key)
                                    if (found) {
                                        current = found.value
                                    }
                                } else if (current && current.get) {
                                    current = current.get(key, true) // true to keep node
                                }
                            }

                            // If we found the node, get its range
                            // YAML library node.range is [start, end]
                            if (current && current.range) {
                                range = [current.range[0], current.range[1]]
                            }

                            // Fallback: syntax errors or root errors might not map perfectly
                            // If we can't map to a value, try mapping to the key?
                            if (!range) {
                                // Try finding just the key?
                                const nodeInMap = yamlDoc.getIn(path, true) as any
                                if (nodeInMap && nodeInMap.range) {
                                    range = [nodeInMap.range[0], nodeInMap.range[1]]
                                }
                            }
                        }

                        // If still no range (e.g. required property missing), highlight the whole block or the first line?
                        // Or maybe just the key that is invalid?

                        // For simplicity MVP: If we have a path, try to use yamlDoc.getIn
                        if (path.length > 0) {
                            const node = yamlDoc.getIn(path, true) as any
                            if (node && node.range) {
                                range = [node.range[0], node.range[1]]
                            }
                        }

                        if (range) {
                            decorations.push(
                                Decoration.inline(offset + range[0], offset + range[1], {
                                    class: 'squiggly-error',
                                    title: err.message || 'Validation Error',
                                    nodeName: 'span' // Ensure it wraps in a span
                                })
                            )
                        } else {
                            // Fallback: decoration on the whole block? Or maybe just the first line?
                            // decorations.push(
                            //    Decoration.inline(offset, offset + text.length, {
                            //        class: 'squiggly-error-block',
                            //        title: err.message
                            //    })
                            // )
                        }
                    })
                }

                // Check for indented closing fences (common mistake causing "swallowed" document)
                const indentedFenceRegex = /(^|\n)([ \t]+---)(\s|$)/g
                let match
                while ((match = indentedFenceRegex.exec(text)) !== null) {
                    const start = match.index + match[1]!.length
                    const end = start + match[2]!.length

                    decorations.push(
                        Decoration.inline(pos + 1 + start, pos + 1 + end, {
                            class: 'squiggly-error',
                            title: 'Indented closing fence detected. Remove indentation to close frontmatter block.',
                            nodeName: 'span'
                        })
                    )
                }

                // Also handle YAML Syntax Errors
                if (yamlDoc.errors.length > 0) {
                    const offset = pos + 1
                    yamlDoc.errors.forEach(err => {
                        if (err && err.pos) {
                            const [start, end] = err.pos as [number, number]
                            decorations.push(
                                Decoration.inline(offset + start, offset + end + 1, { // +1 to ensure visibility
                                    class: 'squiggly-error',
                                    title: `Syntax Error: ${err.message}`
                                })
                            )
                        }
                    })
                }

            } catch (e) {
                console.warn('Validation failed:', e)
            }
        }
    })

    return DecorationSet.create(doc, decorations)
}
