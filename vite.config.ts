import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:3001',
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('xterm')) {
              return 'vendor-terminal';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom') || id.includes('scheduler') || id.includes('prop-types')) {
              return 'vendor-react';
            }
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'vendor-i18n';
            }
            return 'vendor';
          }
          if (id.includes('src/locales/')) {
            const match = id.match(/src\/locales\/([a-z0-9-_]+)\.ts/i);
            if (match) {
              const lang = match[1];
              // Group common/large languages or just split some
              if (['en', 'fr', 'es', 'zh', 'ru', 'de', 'ja'].includes(lang)) {
                return `locale-${lang}`;
              }
              if (['it', 'pt', 'ar', 'sw', 'yo', 'eo', 'hi', 'ko', 'no'].includes(lang)) {
                return 'locales-group-1';
              }
              if (['sv', 'pa', 'fi', 'pl', 'tr', 'ca', 'cs', 'el', 'he'].includes(lang)) {
                return 'locales-group-2';
              }
              return 'locales-others';
            }
            return 'locales';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
