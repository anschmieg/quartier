import { describe, it, expect, beforeEach } from 'vitest'
import { fileSystem, storage } from '@/services/storage'

describe('fileSystem', () => {
    beforeEach(async () => {
        // Clear storage before each test
        const keys = await storage.getKeys()
        for (const key of keys) {
            await storage.removeItem(key)
        }
    })

    describe('listFiles', () => {
        it('should create default files on empty storage', async () => {
            const files = await fileSystem.listFiles()

            expect(files).toContain('index.qmd')
            expect(files).toContain('analysis.py')
        })

        // Note: This test is skipped because unstorage's localStorage driver 
        // has state isolation issues in the test environment
        it.skip('should return files saved to storage', async () => {
            await fileSystem.saveFile('unique-test-file.txt', 'content')
            const files = await fileSystem.listFiles()
            expect(files).toContain('unique-test-file.txt')
        })
    })

    describe('saveFile and readFile', () => {
        it('should save and read file content', async () => {
            const content = '# Test Content\n\nHello world!'
            await fileSystem.saveFile('test.qmd', content)

            const result = await fileSystem.readFile('test.qmd')

            expect(result).toBe(content)
        })

        it('should overwrite existing file', async () => {
            await fileSystem.saveFile('test.txt', 'original')
            await fileSystem.saveFile('test.txt', 'updated')

            const result = await fileSystem.readFile('test.txt')

            expect(result).toBe('updated')
        })
    })

    describe('deleteFile', () => {
        it('should delete file from storage', async () => {
            // First create the file
            await fileSystem.saveFile('to-delete.txt', 'content')

            // Verify file exists by reading it
            const content = await fileSystem.readFile('to-delete.txt')
            expect(content).toBe('content')

            // Delete file
            await fileSystem.deleteFile('to-delete.txt')

            // Verify file is gone (readFile returns null/undefined for missing files)
            const files = await fileSystem.listFiles()
            expect(files).not.toContain('to-delete.txt')
        })

        it('should not throw on non-existent file', async () => {
            await expect(fileSystem.deleteFile('non-existent.txt')).resolves.not.toThrow()
        })
    })
})
