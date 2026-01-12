import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    watch: {
      // pnpm store is configured to live inside the repo (see `.pnpm-store/`).
      // Vite's file watcher will otherwise traverse it and can hit OS limits
      // (ENOSPC: System limit for number of file watchers reached), breaking
      // Playwright's webServer startup.
      ignored: [/(^|[\\/])\.pnpm-store([\\/]|$)/],
    },
  },
})
