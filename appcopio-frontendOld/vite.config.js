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
                globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
                runtimeCaching: [
                    {
                        // Regla para que la autenticación NUNCA se cachee
                        urlPattern: ({ url }) => url.pathname.startsWith('/api/auth'),
                        handler: 'NetworkOnly',
                    },
                    {
                        // Regla para las peticiones GET a nuestra API (sin cambios)
                        urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
                        handler: 'StaleWhileRevalidate',
                        options: { cacheName: 'api-cache' },
                    },
                    // --- INICIO DE LA NUEVA REGLA OFFLINE ---
                    {
                        // Se aplica a cualquier petición a nuestra API que NO sea GET.
                        urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
                        handler: 'NetworkOnly', // Siempre intenta ir a la red primero.
                        method: 'POST', // Aplica a POST
                        options: {
                            // Este es el plugin mágico.
                            backgroundSync: {
                                name: 'appcopio-mutation-queue', // Nombre de la cola
                                options: {
                                    maxRetentionTime: 24 * 60, // Reintentar por hasta 24 horas
                                },
                            },
                        },
                    },
                    // Repetimos la regla para otros métodos
                    {
                        urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
                        handler: 'NetworkOnly',
                        method: 'PUT',
                        options: { backgroundSync: { name: 'appcopio-mutation-queue' } },
                    },
                    {
                        urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
                        handler: 'NetworkOnly',
                        method: 'PATCH',
                        options: { backgroundSync: { name: 'appcopio-mutation-queue' } },
                    },
                    {
                        urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
                        handler: 'NetworkOnly',
                        method: 'DELETE',
                        options: { backgroundSync: { name: 'appcopio-mutation-queue' } },
                    },
                    // --- FIN DE LA NUEVA REGLA OFFLINE ---
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
});
