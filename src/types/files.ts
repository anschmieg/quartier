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

/**
 * Convert flat file list to hierarchical tree structure
 */
export function buildFileTree(paths: string[]): FileNode[] {
    const root: FileNode[] = []
    const map = new Map<string, FileNode>()

    // Sort paths to ensure parents come before children
    const sortedPaths = [...paths].sort()

    for (const filePath of sortedPaths) {
        const parts = filePath.split('/')
        let currentPath = ''
        let parentChildren = root

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i]
            if (!part) continue // Skip empty parts

            currentPath = currentPath ? `${currentPath}/${part}` : part
            const isFile = i === parts.length - 1

            let node = map.get(currentPath)
            if (!node) {
                node = {
                    id: currentPath,
                    name: part,
                    type: isFile ? 'file' : 'folder',
                    path: currentPath,
                    children: isFile ? undefined : [],
                }
                map.set(currentPath, node)
                parentChildren.push(node)
            }

            if (!isFile && node.children) {
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
