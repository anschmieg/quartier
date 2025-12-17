/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['@milkdown/plugin-prism', 'refractor']
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      }
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    exclude: ['**/e2e/**', '**/node_modules/**'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@milkdown') || id.includes('prosemirror') || id.includes('yjs') || id.includes('y-websocket') || id.includes('y-partykit') || id.includes('y-indexeddb') || id.includes('remark-directive') || id.includes('refractor') || id.includes('prismjs')) {
              return 'editor-libs'
            }
            if (id.includes('codemirror') || id.includes('vue-codemirror') || id.includes('vscode-icons')) {
              return 'code-editor'
            }
            if (id.includes('lucide') || id.includes('radix') || id.includes('shadcn') || id.includes('reka-ui')) {
              return 'ui-libs'
            }
          }
        }
      }
    }
  },
  worker: {
    format: 'es'
  }
})
