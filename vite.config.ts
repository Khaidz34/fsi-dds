import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss()
  ],
  base: '/',
  resolve: {
    alias: {
      'framer-motion': '/src/framer-motion-mock.ts'
    }
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : []
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (
            id.includes('/react/') ||
            id.includes('\\react\\') ||
            id.includes('/react-dom/') ||
            id.includes('\\react-dom\\') ||
            id.includes('/scheduler/') ||
            id.includes('\\scheduler\\')
          ) {
            return 'vendor-react';
          }
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) {
            return 'vendor-charts';
          }
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('@supabase/')) {
            return 'vendor-supabase';
          }
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
}))
