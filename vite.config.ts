import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5180,
    host: '0.0.0.0',
    strictPort: true,
    open: true,
    proxy: {
      // SSE / 后端接口代理（实际接入后端时启用）
      // '/api': {
      //   target: 'http://localhost:8000',
      //   changeOrigin: true,
      // }
    }
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          markdown: ['markdown-it', 'highlight.js']
        }
      }
    }
  }
})
