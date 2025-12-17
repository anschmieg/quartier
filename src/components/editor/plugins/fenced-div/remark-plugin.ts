import type { Root, Content, Paragraph, Text } from 'mdast'

// Helper to parse Pandoc-style attributes: {.class #id key=val}
function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const classes: string[] = []
  
  // Remove enclosing braces
  const content = attrString.replace(/^\{|\}$/g, '').trim()
  
  // Match tokens: .class, #id, key=value
  const tokens = content.split(/\s+/)
  
  tokens.forEach(token => {
    if (token.startsWith('.')) {
      classes.push(token.slice(1))
    } else if (token.startsWith('#')) {
      attrs.id = token.slice(1)
    } else if (token.includes('=')) {
      const parts = token.split('=')
      const key = parts[0]
      const val = parts[1]
      if (key && val) {
        attrs[key] = val.replace(/^"|"$/g, '') // strip quotes
      }
    }
  })
  
  if (classes.length > 0) {
    attrs.class = classes.join(' ')
  }
  
  return attrs
}

interface ContainerDirective {
  type: 'containerDirective'
  name: string
  attributes: Record<string, string>
  children: Content[]
  data?: {
    hName: string
    hProperties: Record<string, string>
  }
}

function transformFences(parent: { children: Content[] }): void {
  if (!parent.children) return
  
  let i = 0
  while (i < parent.children.length) {
    const child = parent.children[i]
    if (!child) {
      i++
      continue
    }
    
    // Only process paragraphs
    if (child.type !== 'paragraph') {
      i++
      continue
    }
    
    const paragraph = child as Paragraph
    const firstChild = paragraph.children?.[0]
    if (!firstChild || firstChild.type !== 'text') {
      i++
      continue
    }
    
    const text = (firstChild as Text).value.trim()
    
    // Case 1: Single Paragraph (no blank lines between fences)
    // Matches: ::: {.class}\ncontent\n:::
    const singleMatch = text.match(/^:::\s*(\{.*\})\n([\s\S]*?)\n:::$/)
    
    if (singleMatch && singleMatch[1]) {
      const attrs = parseAttributes(singleMatch[1])
      const contentText = singleMatch[2] || ''
      
      const directive: ContainerDirective = {
        type: 'containerDirective',
        name: 'div',
        attributes: attrs,
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', value: contentText }]
          } as Paragraph
        ],
        data: {
          hName: 'div',
          hProperties: attrs
        }
      }
      
      parent.children.splice(i, 1, directive as unknown as Content)
      transformFences(directive as unknown as { children: Content[] })
      i++
      continue
    }

    // Case 2: Multi-paragraph (blank lines causing separate nodes)
    // Match start fence: ::: {.class}
    const match = text.match(/^:::\s*(\{.*\})$/)
    
    if (match && match[1]) {
      const startAttr = match[1]
      
      // Search for end fence
      let j = i + 1
      let foundEnd = false
      while (j < parent.children.length) {
        const sibling = parent.children[j]
        if (!sibling) {
          j++
          continue
        }
        if (sibling.type === 'paragraph') {
          const sibPara = sibling as Paragraph
          const sibFirst = sibPara.children?.[0]
          if (sibFirst && sibFirst.type === 'text') {
            const sibText = (sibFirst as Text).value.trim()
            if (sibText === ':::') {
              foundEnd = true
              break
            }
          }
        }
        j++
      }
      
      if (foundEnd) {
        const contentNodes = parent.children.slice(i + 1, j)
        const attrs = parseAttributes(startAttr)
        
        const directive: ContainerDirective = {
          type: 'containerDirective',
          name: 'div',
          attributes: attrs,
          children: contentNodes,
          data: {
            hName: 'div',
            hProperties: attrs
          }
        }
        
        parent.children.splice(i, j - i + 1, directive as unknown as Content)
        transformFences(directive as unknown as { children: Content[] })
        i++
        continue
      }
    }
    
    i++
  }
}

export function remarkFencedDivPlugin() {
  return (tree: Root): void => {
    // Transform root children
    transformFences(tree as unknown as { children: Content[] })
    
    // Also transform blockquotes and other containers that might have fenced divs
    const stack: { children: Content[] }[] = [tree as unknown as { children: Content[] }]
    while (stack.length > 0) {
      const node = stack.pop()!
      for (const child of node.children) {
        if ('children' in child && Array.isArray((child as any).children)) {
          transformFences(child as { children: Content[] })
          stack.push(child as { children: Content[] })
        }
      }
    }
  }
}
