import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 默认代理到 Python demo，可在 vite.config 中改 target
const BACKEND = process.env.JEEFLOW_BACKEND || 'http://localhost:8100'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/wf': { target: BACKEND, changeOrigin: true },
    }
  }
})
