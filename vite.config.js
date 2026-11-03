import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'frontend',
    emptyOutDir: false,
    rollupOptions: {
      input: 'src/main.jsx',
      output: {
        entryFileNames: 'react-app.js',
        format: 'es'
      }
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  }
});

