import type { Node } from 'unist'
import { visit } from 'unist-util-visit'

export function remarkHtmlComment() {
  return (tree: Node) => {
    visit(tree, 'html', (node: any) => {
      const value = node.value as string
      if (!value) return
      
      const trimmed = value.trim()
      const match = trimmed.match(/^<!--([\s\S]*?)-->$/)
      
      if (match) {
        node.type = 'comment'
        node.content = match[1].trim()
        delete node.value
      }
    })
  }
}
