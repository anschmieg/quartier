import { visit } from 'unist-util-visit'

export const simpleCitePlugin = () => {
    return (tree: any) => {
        visit(tree, 'text', (node: any, index, parent: any) => {
            if (typeof index !== 'number' || !node.value || !parent) return

            // Match [@key]
            // Allow more characters including . / +
            const regex = /\[@([^\s\]]+)\]/g
            
            const parts: any[] = []
            let lastIndex = 0
            let match

            while ((match = regex.exec(node.value)) !== null) {
                // Text before match
                if (match.index > lastIndex) {
                    parts.push({
                        type: 'text',
                        value: node.value.slice(lastIndex, match.index)
                    })
                }

                // Cite node
                const key = match[1]
                parts.push({
                    type: 'cite',
                    data: {
                        citeItems: [{ key }]
                    }
                })

                lastIndex = regex.lastIndex
            }

            // Only modify if we found matches
            if (parts.length > 0) {
                // Text after match
                if (lastIndex < node.value.length) {
                    parts.push({
                        type: 'text',
                        value: node.value.slice(lastIndex)
                    })
                }

                // Replace the single text node with our new nodes
                parent.children.splice(index, 1, ...parts)
                
                // Return index to continue traversal after our insertions
                return index + parts.length
            }
        })
    }
}
