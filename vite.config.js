import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',                      // project root (where index.html lives)
  publicDir: 'data',              // serve JSON/config files for fetch()
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
    sourcemap: true
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