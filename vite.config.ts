import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Path resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },

  // Build optimization
  build: {
    // Target modern browsers for smaller bundle
    target: 'esnext',
    // Increase chunk size warning limit (Live2D is large)
    chunkSizeWarningLimit: 1000,
    // Minify with esbuild (faster than terser)
    minify: 'esbuild',
    // Source maps for debugging (disabled in production)
    sourcemap: false,
    // Rollup options for code splitting
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom'],
          // Live2D and rendering
          'live2d-vendor': ['pixi.js', 'oh-my-live2d'],
          // AI SDK (Vercel AI)
          'ai-sdk': ['ai', '@ai-sdk/openai', '@ai-sdk/anthropic', 'ollama-ai-provider'],
          // LangChain
          langchain: ['@langchain/core', '@langchain/openai', '@langchain/anthropic', '@langchain/langgraph'],
          // Tauri plugins
          'tauri-plugins': [
            '@tauri-apps/api',
            '@tauri-apps/plugin-clipboard-manager',
            '@tauri-apps/plugin-dialog',
            '@tauri-apps/plugin-fs',
            '@tauri-apps/plugin-opener',
            '@tauri-apps/plugin-shell',
            '@tauri-apps/plugin-sql',
          ],
          // Utilities
          utils: ['uuid', 'date-fns', 'zod', 'zustand'],
        },
        // Chunk file naming
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },

  // Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'zustand',
      'uuid',
      'zod',
    ],
    // Exclude large dependencies that don't need pre-bundling
    exclude: ['oh-my-live2d'],
  },

  // Define globals
  define: {
    __APP_VERSION__: JSON.stringify('0.1.0'),
  },
}));
