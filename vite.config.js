import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 新增伺服器配置區塊 (Server Configuration)
  server: {
    // 允許區域網路中的所有 IP 位址存取 (包括您的手機)
    host: '0.0.0.0', 
    // 確保埠號是 5173 (可選，通常這是預設值)
    port: 5173,
  }
})