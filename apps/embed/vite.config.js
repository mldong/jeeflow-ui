import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // workspace 源码引用：ui-kit 改代码即时热更新（与 demo 同款）
      '@mldong/jeeflow-ui': fileURLToPath(new URL('../../packages/ui-kit/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5176,
  },
})
