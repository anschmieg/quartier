/**
 * File system types for hierarchical tree structure
 */

export interface FileNode {
    id: string
    name: string
    type: 'file' | 'folder'
    path: string
    children?: FileNode[]
}

export interface FileItem {
    path: string
    type: 'file' | 'dir'
}

/**
 * Convert flat file list to hierarchical tree structure
 * Now accepts FileItem objects with explicit type info
 */
export function buildFileTree(items: FileItem[]): FileNode[] {
    const root: FileNode[] = []
    const map = new Map<string, FileNode>()

    // Sort items to ensure parents come before children
    const sortedItems = [...items].sort((a, b) => a.path.localeCompare(b.path))

    for (const item of sortedItems) {
        const parts = item.path.split('/')
        let currentPath = ''
        let parentChildren = root

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i]
            if (!part) continue // Skip empty parts

            currentPath = currentPath ? `${currentPath}/${part}` : part
            const isLastPart = i === parts.length - 1

            let node = map.get(currentPath)
            if (!node) {
                // Use explicit type from API for leaf nodes, infer 'folder' for intermediate paths
                const nodeType = isLastPart
                    ? (item.type === 'dir' ? 'folder' : 'file')
                    : 'folder'

                node = {
                    id: currentPath,
                    name: part,
                    type: nodeType,
                    path: currentPath,
                    children: nodeType === 'folder' ? [] : undefined,
                }
                map.set(currentPath, node)
                parentChildren.push(node)
            }

            if (node.type === 'folder' && node.children) {
                parentChildren = node.children
            }
        }
    }

    return root
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.')
    return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : ''
}
