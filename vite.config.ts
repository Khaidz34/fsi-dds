import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  base: '/', // Đổi từ '/FSI-DDS/' thành '/' cho production
  resolve: {
    alias: {
      'framer-motion': '/src/framer-motion-mock.ts'
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks - avoid circular dependencies
          if (id.includes('node_modules/react-dom')) {
            return 'react-dom-vendor';
          }
          if (id.includes('node_modules/react')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/recharts')) {
            return 'recharts-vendor';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          // Component chunks
          if (id.includes('src/components')) {
            return 'components';
          }
          if (id.includes('src/hooks')) {
            return 'hooks';
          }
          if (id.includes('src/services')) {
            return 'services';
          }
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
})