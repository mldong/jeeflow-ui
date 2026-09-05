import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

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
      // 开发环境：相对路径代理到本地后端，rewrite 去掉前缀
      '/java-api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/java-api/, ''),
      },
      '/go-api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/go-api/, ''),
      },
      '/python-api': {
        target: 'http://localhost:8100',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/python-api/, ''),
      },
      '/node-api': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/node-api/, ''),
      },
      '/php-api': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/php-api/, ''),
      },
      '/rust-api': {
        target: 'http://localhost:8091',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rust-api/, ''),
      },
      '/moon-api': {
        target: 'http://localhost:8092',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/moon-api/, ''),
      },
      '/csharp-api': {
        target: 'http://localhost:8093',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/csharp-api/, ''),
      },
    },
  },
})
