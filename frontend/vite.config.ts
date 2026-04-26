import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// We serve the project-root samples/ directory as the public dir so that
// precomputed assets (images, videos, JSON) are available under /<sample>/...
// at both dev time and in the production build.
export default defineConfig({
  plugins: [react()],
  publicDir: path.resolve(__dirname, '../samples'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
})
