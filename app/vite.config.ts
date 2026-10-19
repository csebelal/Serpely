import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  // Use root-relative assets so direct route reloads work in production.
  base: '/',
  plugins: [inspectAttr(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor2: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          editor: ['@tiptap/react', '@tiptap/starter-kit'],
          motion: ['gsap', '@gsap/react'],
        },
      },
    },
  },
  server: {
    // 5173 falls inside a Windows reserved port range (5141-5240, Hyper-V/WSL),
    // which makes the bind fail with EACCES. Use a free port instead.
    port: 5500,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/chatbot': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (p: string) => p.replace(/^\/chatbot/, ''),
      },
    },
  },
});
