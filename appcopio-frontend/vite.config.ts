// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Configuración completa del plugin PWA para la funcionalidad offline
    VitePWA({
      // Estrategia de actualización: el service worker se actualizará automáticamente en segundo plano.
      registerType: 'autoUpdate',
      // Habilita las funcionalidades PWA también en el modo de desarrollo para facilitar las pruebas.
      devOptions: {
        enabled: true
      },
      // Configuración de Workbox, la librería que genera el service worker.
      workbox: {
        // 'globPatterns' le dice a Workbox qué archivos de la aplicación (el "App Shell") debe guardar en caché.
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        
        // 'runtimeCaching' define cómo manejar las peticiones en tiempo de ejecución, como las llamadas a la API.
        // Esto es clave para la resiliencia y el funcionamiento offline que requiere el proyecto.
        runtimeCaching: [
          {
            // Esta expresión regular intercepta todas las peticiones que van a tu backend API.
            urlPattern: /^http:\/\/localhost:4000\/api\/.*/,
            // 'StaleWhileRevalidate' es la estrategia de caché:
            // 1. Sirve datos desde la caché inmediatamente si están disponibles (rápido).
            // 2. En paralelo, intenta obtener datos frescos de la red para actualizar la caché.
            // 3. Si la red falla (offline), no pasa nada, el usuario se queda con los datos de la caché.
            handler: 'StaleWhileRevalidate',
            options: {
              // Nombre específico para la caché de la API.
              cacheName: 'api-cache',
              // Reglas para la caché.
              expiration: {
                maxEntries: 50,      // Máximo de 50 respuestas en caché.
                maxAgeSeconds: 60 * 60 * 24 // Las respuestas expiran después de 1 día.
              },
              cacheableResponse: {
                // Solo se cachean las respuestas que fueron exitosas (status 200).
                statuses: [0, 200]
              }
            }
          }
        ]
      },
     
      manifest: {
        name: 'AppCopio',
        short_name: 'AppCopio',
        description: 'Plataforma de gestión integral para centros de acopio y albergues post-catástrofe.',
        theme_color: '#317EFB',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png', 
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png', 
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})