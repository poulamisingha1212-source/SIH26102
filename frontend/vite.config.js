import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/works': {
        target: process.env.BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/stats': {
        target: process.env.BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/sync': {
        target: process.env.BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
