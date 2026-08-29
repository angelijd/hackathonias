import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  build: {
    outDir: path.resolve(__dirname, 'platforms_dist/SennaLogin'),
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/platforms/senna_login/main.tsx'),
    },
  },
});
