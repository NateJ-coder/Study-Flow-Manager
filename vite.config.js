import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/Study-Flow-Manager/',    // GitHub Pages base path
  root: '.',                      // project root (where index.html lives)
  publicDir: 'assets',            // serve assets, data, and images
  server: {
    port: 5173,
    open: true,                   // auto-open browser
    watch: {
      ignored: ['!**/assets/**', '!**/data/**'] // watch images/audio/JSON
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        calendar: 'calendar.html',
        settings: 'settings.html'
      }
    }
  },
  resolve: {
    alias: {
      '@js': resolve(__dirname, 'js'),
      '@css': resolve(__dirname, 'css'),
      '@assets': resolve(__dirname, 'assets'),
      '@data': resolve(__dirname, 'data')
    }
  }
});