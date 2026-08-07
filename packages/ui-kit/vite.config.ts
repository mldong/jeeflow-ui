import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

// 库模式构建（@mldong/jeeflow-ui）——参考 flow-designer 的 vite.config.lib.ts
export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'JeeflowUi',
      fileName: 'jeeflow-ui',
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: { vue: 'Vue' },
      },
    },
  },
})
