import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Use relative base so GitHub Pages (main/docs) can resolve assets correctly
  base: './',
  plugins: [react()],
  build: {
    outDir: 'docs',
  },
});
