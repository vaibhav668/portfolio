import { defineConfig } from 'vite';

// base './' lets the built site run from any folder or GitHub Pages sub-path.
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 900 },
});
