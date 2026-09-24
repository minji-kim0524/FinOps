import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // main.jsx는 React 루트를 마운트하기만 하는 진입점이라 단위 테스트로 의미 있게
      // 검증할 로직이 없어 측정 대상에서 제외한다.
      exclude: ['src/main.jsx'],
    },
  },
  build: {
    // 로그인 화면이 정말로 필요로 하는 antd 공용 런타임(preload-helper 청크)이 약 515KB라,
    // 이 값은 "실수로 또 다른 덩어리가 생겼는지"를 감지하기 위한 임계값입니다.
    chunkSizeWarningLimit: 520,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) {
            return 'vendor-react'
          }
          // recharts/antd/@ant-design/rc-*는 일부러 강제 청크로 묶지 않는다. 로그인 화면과 로그인
          // 이후 화면(AppContent, React.lazy로 지연 로딩)이 이 라이브러리를 함께 쓰는데,
          // 여기서 하나로 몰아넣으면 AppContent 전용 컴포넌트(Table/DatePicker/Upload 등)
          // 까지 로그인 화면의 초기 로딩에 끼어 들어가 지연 로딩 효과가 사라진다. Rollup의
          // 자동 분할에 맡겨 정적/동적 import 경계를 따라 자연스럽게 나뉘도록 둔다.
        },
      },
    },
  },
})
