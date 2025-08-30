// appcopio-frontend/vite.config.ts

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      
      // Ya no usamos 'injectManifest'. Vite ahora generará el SW por nosotros.
      
      devOptions: {
        enabled: true, // Mantenemos el SW activo en desarrollo
      },

      // --- INICIO DE LA NUEVA CONFIGURACIÓN ---
      workbox: {
        // 1. Esto le ordena a Workbox encontrar TODOS los archivos importantes
        //    y añadirlos a la lista de precaché. Esto arregla el manifiesto vacío.
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],

        // 2. Esto recrea nuestra regla para cachear las respuestas de la API.
        runtimeCaching: [
          {
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
        ],
      },
      // --- FIN DE LA NUEVA CONFIGURACIÓN ---

      manifest: {
        // ... tu manifest.json aquí ...
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