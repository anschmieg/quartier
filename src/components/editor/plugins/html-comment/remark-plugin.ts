import type { Root, Content, Paragraph, Text } from 'mdast'

export function remarkHtmlComment() {
  console.log('[remarkHtmlComment] Plugin initializing')
  
  // This is the transformer function that unified will call
  return function transformer(tree: Root) {
    console.log('[remarkHtmlComment] Transformer called')
    
    // During initialization, tree might be empty - that's normal
    if (!tree || !tree.children || tree.children.length === 0) {
      console.log('[remarkHtmlComment] Tree is empty (likely initialization), skipping')
      return
    }
    
    console.log('[remarkHtmlComment] Processing tree with', tree.children.length, 'children')
    
    // First pass: Handle standalone HTML comment nodes
    transformHtmlNodes(tree)
    
    // Second pass: Handle HTML comments embedded in text/paragraphs
    transformTextComments(tree)
    
    console.log('[remarkHtmlComment] Finished processing')
  }
}

function transformHtmlNodes(parent: { children?: Content[] }) {
  if (!parent.children) return
  
  console.log('[transformHtmlNodes] Checking', parent.children.length, 'children')
  
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i]
    if (!child) continue
    
    // Handle HTML nodes
    if (child.type === 'html') {
      console.log('[transformHtmlNodes] Found HTML node:', (child as any).value)
      const value = (child as any).value as string
      if (!value) continue
      
      const trimmed = value.trim()
      const match = trimmed.match(/^<!--([\s\S]*?)-->$/)
      
      if (match) {
        console.log('[transformHtmlNodes] Matched HTML comment, transforming to comment node')
        // Transform to comment node
        const commentNode = {
          type: 'comment' as const,
          content: (match[1] ?? '').trim(),
          data: {
            hName: 'span',
            hProperties: {
              'data-type': 'comment',
              'data-content': (match[1] ?? '').trim()
            }
          }
        }
        parent.children[i] = commentNode as any
      }
    }
    
    // Recurse into children
    if ('children' in child && Array.isArray((child as any).children)) {
      transformHtmlNodes(child as { children: Content[] })
    }
  }
}

function transformTextComments(parent: { children?: Content[] }) {
  if (!parent.children) return
  
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i]
    if (!child) continue
    
    // Handle paragraphs that might contain HTML comments as text
    if (child.type === 'paragraph') {
      const para = child as Paragraph
      if (!para.children || para.children.length === 0) continue
      
      // Check if the entire paragraph is just an HTML comment
      if (para.children.length === 1 && para.children[0]?.type === 'text') {
        const textNode = para.children[0] as Text
        const value = textNode.value.trim()
        const match = value.match(/^<!--([\s\S]*?)-->$/)
        
        if (match) {
          // Replace the paragraph with a comment node
          const commentNode = {
            type: 'comment' as const,
            content: (match[1] ?? '').trim(),
            data: {
              hName: 'span',
              hProperties: {
                'data-type': 'comment',
                'data-content': (match[1] ?? '').trim()
              }
            }
          }
          parent.children[i] = commentNode as any
          continue
        }
      }
      
      // Handle inline HTML comments within paragraphs
      const newChildren: Content[] = []
      for (const pchild of para.children) {
        if (!pchild) continue
        if (pchild.type === 'text') {
          const textNode = pchild as Text
          const parts = splitTextByComments(textNode.value)
          newChildren.push(...parts as any)
        } else {
          newChildren.push(pchild)
        }
      }
      
      if (newChildren.length !== para.children.length) {
        para.children = newChildren as any
      }
    }
    
    // Recurse into children
    if ('children' in child && Array.isArray((child as any).children)) {
      transformTextComments(child as { children: Content[] })
    }
  }
}

function splitTextByComments(text: string): Array<Text | { type: 'comment', content: string }> {
  const result: Array<Text | { type: 'comment', content: string }> = []
  const commentRegex = /<!--([\s\S]*?)-->/g
  
  let lastIndex = 0
  let match
  
  while ((match = commentRegex.exec(text)) !== null) {
    // Add text before the comment
    if (match.index > lastIndex) {
      result.push({
        type: 'text',
        value: text.substring(lastIndex, match.index)
      })
    }
    
    // Add the comment
    result.push({
      type: 'comment' as const,
      content: (match[1] ?? '').trim()
    })
    
    lastIndex = commentRegex.lastIndex
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    result.push({
      type: 'text',
      value: text.substring(lastIndex)
    })
  }
  
  return result.length > 0 ? result : [{ type: 'text', value: text }]
}
