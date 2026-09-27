import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: { alias: { 'canvas-sdk': fileURLToPath(new URL('./src/sdk/index.ts', import.meta.url)) } },
  server: { host: '127.0.0.1', strictPort: true },
  preview: { host: '127.0.0.1', strictPort: true },
});
