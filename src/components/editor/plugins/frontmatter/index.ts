import { $nodeSchema, $remark } from '@milkdown/utils'
import remarkFrontmatter from 'remark-frontmatter'
import { Node } from '@milkdown/prose/model'

// Define the unique name for our node in the schema
export const frontmatterSchemaName = 'frontmatter'

// Create the Remark plugin wrapper
// Wrap remarkFrontmatter to provide default options (Milkdown passes {} otherwise)
// Must use regular function to preserve 'this' context from unified processor
function frontmatterWithDefaults(this: any, options: any) {
    // Milkdown passes {} by default, which breaks remark-frontmatter.
    // We must ensure we pass ['yaml'] if options is empty or undefined.
    const actualOptions = !options || (typeof options === 'object' && Object.keys(options).length === 0)
        ? ['yaml']
        : options
    return remarkFrontmatter.call(this, actualOptions)
}
export const remarkFrontmatterPlugin = $remark('frontmatter', () => frontmatterWithDefaults as any)

// Create the Node Schema using $nodeSchema (which exposes .key for configuration)
export const frontmatterNode = $nodeSchema(frontmatterSchemaName, () => ({
    content: 'text*',
    group: 'block',
    code: true,
    isolating: true,
    defining: true,
    marks: '',

    parseDOM: [{
        tag: 'div[data-type="frontmatter"]',
        preserveWhitespace: 'full'
    }],

    toDOM: (_node: Node) => [
        'div',
        { 'data-type': 'frontmatter', class: 'frontmatter' },
        ['pre', ['code', 0]]
    ],

    parseMarkdown: {
        match: ({ type }) => type === 'yaml',
        runner: (state, node, type) => {
            state.openNode(type)
            if (node.value) {
                state.addText(node.value as string)
            }
            state.closeNode()
        },
    },

    toMarkdown: {
        match: (node) => node.type.name === frontmatterSchemaName,
        runner: (state, node) => {
            // Milkdown v7 serializer builds MDAST, not Markdown string directly.
            // We create a 'yaml' node and remark-frontmatter handles the delimiters using this node.
            state.addNode('yaml', undefined, node.textContent)
        },
    },
}))

export { frontmatterSyntax } from './syntax'
export { frontmatterValidation } from './validation'
