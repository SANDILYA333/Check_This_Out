import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        shopsphere: 'shopsphere.html',
      },
      output: {
        entryFileNames: 'assets/[name].js',
      },
    },
  },
});
