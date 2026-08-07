import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

// 默认代理到 Python demo，可在 vite.config 中改 target
const BACKEND = process.env.JEEFLOW_BACKEND || 'http://localhost:8100'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // workspace 源码引用：ui-kit 改代码即时热更新（阶段 2 发布后换 npm 依赖）
      '@mldong/jeeflow-ui': fileURLToPath(new URL('../../packages/ui-kit/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/wf': { target: BACKEND, changeOrigin: true },
    },
  },
})
