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
    registerType: 'autoUpdate',
    devOptions: {
      enabled: true
    },
    // --- CAMBIO DE ESTRATEGIA ---
    // Ya no usamos la configuración de workbox aquí porque la pondremos en nuestro propio archivo
    workbox: {}, 
    // Le decimos a Vite que nuestra estrategia ahora es inyectar el manifest en nuestro propio service worker
    strategies: 'injectManifest',
    srcDir: 'src', // La carpeta donde está nuestro archivo de service worker
    filename: 'sw.ts' // El nombre de nuestro archivo de service worker
    // --- FIN DEL CAMBIO ---
    ,
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
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});