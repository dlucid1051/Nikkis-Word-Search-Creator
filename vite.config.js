import { defineConfig } from 'vite';

// Replace 'wordsearch-creator' with your exact GitHub repository name if different
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});