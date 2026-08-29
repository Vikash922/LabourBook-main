import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          'pdf-vendor': ['jspdf', 'jspdf-autotable', 'html2canvas'],
          'ui-vendor': ['lucide-react', 'clsx', 'tailwind-merge']
        }
      }
    }
  }
});
