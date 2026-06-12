import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('node_modules/@monaco-editor') || id.includes('node_modules/monaco-editor') || id.includes('node_modules/@codesandbox')) {
              return 'vendor-editor';
            }
            if (id.includes('node_modules/framer-motion') || id.includes('node_modules/lucide-react') || id.includes('node_modules/recharts')) {
              return 'vendor-ui';
            }
            if (id.includes('node_modules/@google/genai')) {
              return 'vendor-ai';
            }
          }
        }
      }
    }
  };
});
