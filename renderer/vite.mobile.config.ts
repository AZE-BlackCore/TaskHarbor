import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

/**
 * 移动端构建 target（ADR-04：单仓双 build target）
 * 运行：cd renderer && npm run build:mobile
 * 产物：mobile-dist/ → Capacitor webDir
 */
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../mobile-dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      // 输出 index.html：Capacitor webDir 必须以 index.html 为入口
      input: resolve(process.cwd(), 'mobile/index.html'),
    },
  },
});
