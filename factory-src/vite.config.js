import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' → 빌드 결과(dist)를 어느 경로에 올려도(GitHub Pages, 사내 서버 하위 경로 등) 동작
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: { output: { manualChunks: { three: ['three'] } } },
  },
});
