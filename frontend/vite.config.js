import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // antd 하나만으로도 tree-shaking 후 ~1MB라, 이 값은 "실수로 전부 한 덩어리가 됐는지"를
    // 감지하기 위한 임계값입니다. vendor-antd 청크의 정상 크기를 반영해 올려둠.
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) {
            return 'vendor-react'
          }
          if (id.includes('antd') || id.includes('@ant-design') || id.includes('rc-')) {
            return 'vendor-antd'
          }
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'vendor-recharts'
          }
        },
      },
    },
  },
})
