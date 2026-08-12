import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  // Por defecto Vite cachea en node_modules/.vite. Railway monta esa ruta como
  // caché de build, y `npm ci` borra node_modules antes de instalar: no se
  // puede hacer rmdir de un punto de montaje y el deploy muere con EBUSY.
  // Sacando la caché fuera de node_modules, el conflicto desaparece.
  cacheDir: '.vite-cache',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5174,
    // En desarrollo la API va aparte; el proxy evita configurar CORS a mano.
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL ?? 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
      '/uploads': {
        target: process.env.VITE_API_URL ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
