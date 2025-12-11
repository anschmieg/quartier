import { createStorage } from 'unstorage'
import localStorageDriver from 'unstorage/drivers/localstorage'

// In a real app, you would select the driver based on environment variables
// e.g., if (import.meta.env.PROD) use cloudflare-kv or supabase
export const storage = createStorage({
  driver: localStorageDriver({ base: 'quartier:' })
})

// Helper to simulate file system delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const fileSystem = {
  async listFiles() {
    // Mock initial state if empty
    const keys = await storage.getKeys()
    if (keys.length === 0) {
      await this.saveFile('index.qmd', '# Welcome to Quartier\n\nA home for your research. Start editing to begin.')
      await this.saveFile('analysis.py', 'print("Hello World")')
      return ['index.qmd', 'analysis.py']
    }
    return keys
  },

  async readFile(filename: string) {
    await delay(100)
    return await storage.getItem(filename) as string
  },

  async saveFile(filename: string, content: string) {
    await delay(100)
    await storage.setItem(filename, content)
  },

  async deleteFile(filename: string) {
    await delay(100)
    await storage.removeItem(filename)
  }
}
