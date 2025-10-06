import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: process.env.ELECTRON ? './' : '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === 'development',
  },
  server: {
    port: 5173,
  },
});