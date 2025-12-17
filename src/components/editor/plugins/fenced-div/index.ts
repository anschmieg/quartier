
import { $nodeSchema } from '@milkdown/utils'
import type { Node } from '@milkdown/prose/model'

export const fencedDivNodeName = 'fenced_div'

export const fencedDivNode = $nodeSchema(fencedDivNodeName, () => ({
  group: 'block',
  content: 'block+',
  defining: true,
  attrs: {
    class: { default: '' },
    id: { default: '' },
    style: { default: '' },
  },
  parseDOM: [
    {
      tag: 'div[data-type="fenced-div"]',
      priority: 40,
      getAttrs: (dom: HTMLElement) => ({
        class: dom.getAttribute('class') || '',
        id: dom.getAttribute('id') || '',
        style: dom.getAttribute('style') || ''
      }),
    },
  ],
  toDOM: (node: Node) => {
    const attrs: Record<string, string> = {
      'data-type': 'fenced-div',
    }
    if (node.attrs.class) attrs.class = node.attrs.class
    if (node.attrs.id) attrs.id = node.attrs.id
    if (node.attrs.style) attrs.style = node.attrs.style
    return ['div', attrs, 0]
  },
  parseMarkdown: {
    match: (node: any) => {
      // Match container directives named 'div' or any that are NOT callouts
      return node.type === 'containerDirective' && 
             node.name === 'div'
    },
    runner: (state: any, node: any, type: any) => {
      const attrs = {
        class: node.attributes?.class || '',
        id: node.attributes?.id || '',
        style: node.attributes?.style || ''
      }
      
      state.openNode(type, attrs)
      state.next(node.children)
      state.closeNode()
    },
  },
  toMarkdown: {
    match: (node: Node) => node.type.name === fencedDivNodeName,
    runner: (state: any, node: Node) => {
      state.openNode('containerDirective', undefined, {
        name: 'div',
        attributes: {
          class: node.attrs.class,
          id: node.attrs.id,
          style: node.attrs.style
        }
      })
      state.next(node.content)
      state.closeNode()
    },
  },
}))

