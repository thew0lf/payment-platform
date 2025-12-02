import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/reviews.ts',
      name: 'AVNZReviews',
      fileName: 'reviews',
      formats: ['iife'],
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser',
    rollupOptions: {
      output: {
        entryFileNames: 'reviews.js',
      },
    },
  },
  define: {
    'process.env.API_URL': JSON.stringify(process.env.API_URL || 'https://api.avnz.io'),
  },
});
