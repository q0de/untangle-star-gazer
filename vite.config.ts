import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2020',
  },
  plugins: [
    // Only inline for ad builds — toggled via env
    ...(process.env.INLINE === '1' ? [viteSingleFile()] : []),
  ],
});
