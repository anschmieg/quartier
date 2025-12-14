/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
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
  },
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        // manualChunks caused tree-shaking issues with veaury/react
      }
    }
  }
})
