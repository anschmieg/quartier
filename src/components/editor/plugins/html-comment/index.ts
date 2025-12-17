import { $nodeSchema, $remark, $inputRule } from '@milkdown/utils'
import { InputRule } from '@milkdown/prose/inputrules'
import { remarkHtmlComment } from './remark-plugin'

export const commentNodeName = 'comment'

// Define the Comment Node
export const commentNode = $nodeSchema('comment', () => ({
  atom: true,
  inline: true, // Keep inline for now to allow both? Or maybe flexible?
  // group: 'inline', // If we remove group, it might default to generic?
  // Let's try to make it flexible. If inline=true, it MUST be in inline group.
  group: 'inline',
  attrs: {
    content: { default: '' }
  },
  parseDOM: [
    {
      tag: 'span[data-type="comment"]',
      getAttrs: (dom) => {
        if (!(dom instanceof HTMLElement)) return {}
        return { content: dom.getAttribute('data-content') }
      }
    }
  ],
  toDOM: (node) => {
    return ['span', { 
        'data-type': 'comment', 
        'data-content': node.attrs.content,
        class: 'hidden-comment', // We can hide it in source view or handle it via node view
        style: 'display: none;'  // Standard HTML comments are invisible!
    }, `<!-- ${node.attrs.content} -->`]
  },
  parseMarkdown: {
      match: (node) => node.type === 'comment',
      runner: (state, node, type) => {
          state.addNode(type, { content: node.content })
      }
  },
  toMarkdown: {
      match: (node) => node.type.name === 'comment',
      runner: (state, node) => {
          // Serialize back to <!-- content -->
          state.addNode('html', undefined, `<!--${node.attrs.content}-->`)
      }
  }
}))

// Remark plugin integration
export const commentPlugin = $remark('remark-comment', () => remarkHtmlComment())

// Input Rule: Type "<!-- " to insert a comment
export const commentInputRule = $inputRule((ctx) => {
    return new InputRule(
        /<!--\s$/,
        (state, _match, start, end) => {
            return state.tr.replaceWith(
                start, 
                end, 
                commentNode.type(ctx).create({ content: '' })
            )
        }
    )
})
