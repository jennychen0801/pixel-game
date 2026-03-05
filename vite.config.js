import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 解決 GitHub Pages 部署在子目錄下的 404 問題 (使用相對路徑)
  base: './',
})
