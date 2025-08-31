// appcopio-frontend/vite.config.ts

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true, // Mantenemos el SW activo en desarrollo
      },
      workbox: {
        // Esto le ordena a Workbox encontrar TODOS los archivos importantes
        // y añadirlos a la lista de precaché.
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],

        // Definimos las reglas para el caché de peticiones en tiempo real.
        runtimeCaching: [
          {
            // Regla para nuestra propia API
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 días
              },
              cacheableResponse: {
                statuses: [200], // Solo cachear respuestas exitosas
              },
            },
          },
          // --- INICIO DE LA NUEVA REGLA PARA EL MAPA ---
          {
            // Esta regla se aplica a cualquier petición a los dominios de Google Maps.
            urlPattern: /^https:\/\/maps\.googleapis\.com\/.*/,
            // Usamos 'CacheFirst': si el recurso está en el caché, lo sirve de inmediato.
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-maps-cache',
              // Limitamos el número de imágenes de mapa para no llenar el almacenamiento.
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24, // 1 Día
              },
              cacheableResponse: {
                statuses: [0, 200], // Cachea respuestas correctas y opacas
              },
            },
          },
          // --- FIN DE LA NUEVA REGLA PARA EL MAPA ---
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