
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/auth'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'api-cache' },
          },
          {
            urlPattern: ({ url, request }) =>
              url.pathname.startsWith('/api/') && request.method !== 'GET',
            handler: 'NetworkOnly',
            options: {
              backgroundSync: {
                name: 'appcopio-mutation-queue',
                options: {
                  maxRetentionTime: 1440, // 24 horas
                },
              },
            },
          },
        ],
      },
      includeAssets: ['favicon.ico', 'vite.svg'],
      manifest: {
        name: 'AppCopio',
        short_name: 'AppCopio',
        description: 'AppCopio Offline Resilient App',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'vite.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'favicon.ico',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
