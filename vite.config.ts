import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// dev 代理目标，可用环境变量覆盖: VITE_API_URL=http://xxx:8082/ npm run dev
// 仅影响 npm run dev 的代理；打包部署走相对路径直连后端，不读此变量
declare const process: { env: Record<string, string | undefined> }
const API_URL = process.env.VITE_API_URL || "http://localhost:8082/"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // 兜底值:裸跑 vite(非 npm run)时 npm_package_version 为空,会导致 __APP_VERSION__ 不被替换
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '2.0.0'),
  },
  build: {
    // 打包直接输出到 Go 后端的服务目录（dst-admin-go/dist），生产环境由后端托管
    outDir: '../dst-admin-go/dist',
    emptyOutDir: true,
  },
  server: {
    open: false, // 项目启动时自动打开浏览器
    proxy: {
      '/api': {
        target: API_URL,
        changeOrigin: true,
      },
      '/steam': {
        target: API_URL,
        changeOrigin: true,
      },
      '/hello': {
        target: API_URL,
        changeOrigin: true,
      },
    },
  },
})
