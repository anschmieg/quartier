import { describe, it, expect } from 'vitest'
import { buildFileTree, getFileExtension, type FileItem } from '@/types/files'

// Helper to create FileItem from path (all treated as files for simplicity in tests)
function toFileItems(paths: string[]): FileItem[] {
    return paths.map(path => ({ path, type: 'file' as const }))
}

describe('buildFileTree', () => {
    it('should handle empty file list', () => {
        const result = buildFileTree([])
        expect(result).toEqual([])
    })

    it('should create flat list for files without folders', () => {
        const files = toFileItems(['index.qmd', 'analysis.py', 'readme.md'])
        const result = buildFileTree(files)

        expect(result).toHaveLength(3)
        expect(result.map(n => n.name)).toEqual(['analysis.py', 'index.qmd', 'readme.md'])
        expect(result.every(n => n.type === 'file')).toBe(true)
    })

    it('should create nested structure for paths with folders', () => {
        const files = toFileItems([
            'src/main.ts',
            'src/utils/helper.ts',
            'package.json',
        ])
        const result = buildFileTree(files)

        // Should have package.json and src folder at root
        expect(result).toHaveLength(2)

        const packageJson = result.find(n => n.name === 'package.json')
        expect(packageJson?.type).toBe('file')

        const src = result.find(n => n.name === 'src')
        expect(src?.type).toBe('folder')
        expect(src?.children).toHaveLength(2) // main.ts and utils folder

        const utils = src?.children?.find(n => n.name === 'utils')
        expect(utils?.type).toBe('folder')
        expect(utils?.children?.length).toBe(1)
        expect(utils?.children?.[0]?.name).toBe('helper.ts')
    })

    it('should set correct paths for nested items', () => {
        const files = toFileItems(['a/b/c.txt'])
        const result = buildFileTree(files)

        const a = result[0]
        expect(a?.path).toBe('a')

        const b = a?.children?.[0]
        expect(b?.path).toBe('a/b')

        const c = b?.children?.[0]
        expect(c?.path).toBe('a/b/c.txt')
    })

    it('should handle explicit dir type from API', () => {
        const items: FileItem[] = [
            { path: 'docs', type: 'dir' },
            { path: 'README.md', type: 'file' },
        ]
        const result = buildFileTree(items)

        expect(result).toHaveLength(2)
        const docsFolder = result.find(n => n.name === 'docs')
        expect(docsFolder?.type).toBe('folder')

        const readme = result.find(n => n.name === 'README.md')
        expect(readme?.type).toBe('file')
    })
})

describe('getFileExtension', () => {
    it('should return extension for normal files', () => {
        expect(getFileExtension('test.ts')).toBe('ts')
        expect(getFileExtension('file.qmd')).toBe('qmd')
        expect(getFileExtension('script.py')).toBe('py')
    })

    it('should return lowercase extension', () => {
        expect(getFileExtension('FILE.QMD')).toBe('qmd')
        expect(getFileExtension('Test.TS')).toBe('ts')
    })

    it('should handle files without extension', () => {
        expect(getFileExtension('Makefile')).toBe('')
        expect(getFileExtension('README')).toBe('')
    })

    it('should handle dotfiles', () => {
        expect(getFileExtension('.gitignore')).toBe('')
        expect(getFileExtension('.env')).toBe('')
    })

    it('should handle multiple dots', () => {
        expect(getFileExtension('file.test.ts')).toBe('ts')
        expect(getFileExtension('archive.tar.gz')).toBe('gz')
    })
})

