// appcopio-frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      workbox: {
        // Precaché de la aplicación (esto ya funcionaba)
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],

        // Reglas de caché en tiempo real
        runtimeCaching: [
          {
            // Regla para que la autenticación NUNCA se cachee
            urlPattern: ({ url }) => url.pathname.startsWith('/api/auth'),
            handler: 'NetworkOnly',
          },
          {
            // Regla para el resto de las peticiones GET a nuestra API
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // Regla para el mapa de Google
            urlPattern: ({ url }) => url.hostname.includes('googleapis.com'),
            handler: 'CacheFirst',
            options: { cacheName: 'google-maps-cache' },
          },
        ],
      },
      manifest: {
        name: 'AppCopio',
        short_name: 'AppCopio',
        description: 'Gestión de centros de acopio y albergues.',
        theme_color: '#ffffff',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
})