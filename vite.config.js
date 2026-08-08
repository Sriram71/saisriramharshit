import { defineConfig } from 'vite';

export default defineConfig({
  // Static site: index.html at the project root is the single entry point.
  // Set `base` to '/<repo-name>/' if you deploy to a GitHub Pages project site.
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    open: true,
  },
});
