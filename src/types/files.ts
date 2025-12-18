/**
 * File system types for hierarchical tree structure
 */

export interface FileNode {
    id: string
    name: string
    type: 'file' | 'folder'
    path: string
    children?: FileNode[]
    /** True if folder contents have been fetched from API. False means not yet loaded. */
    childrenLoaded?: boolean
}

export interface FileItem {
    path: string
    name?: string
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

    // First pass: determine which folders have children present in items
    // A folder is "loaded" if we have any items that are direct children of it
    const foldersWithChildren = new Set<string>()
    for (const item of sortedItems) {
        const parts = item.path.split('/')
        // For each path segment except the last, that's a parent folder
        for (let i = 0; i < parts.length - 1; i++) {
            const folderPath = parts.slice(0, i + 1).join('/')
            if (folderPath) {
                foldersWithChildren.add(folderPath)
            }
        }
    }

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

                // A folder is marked as "loaded" if we have items under it in the flat list
                // This means we've fetched its contents from the API
                const isLoaded = nodeType === 'folder' 
                    ? foldersWithChildren.has(currentPath) 
                    : undefined

                node = {
                    id: currentPath,
                    // Use explicit name if available and this is the leaf node
                    name: (isLastPart && item.name) ? item.name : part,
                    type: nodeType,
                    path: currentPath,
                    children: nodeType === 'folder' ? [] : undefined,
                    childrenLoaded: isLoaded,
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
