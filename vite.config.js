import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Yunas Games',
        short_name: 'Yunas Games',
        description: 'Yunas Haustier-Spiel mit 12 Minispielen und Zauber-Maler',
        lang: 'de',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        theme_color: '#ec4899',
        background_color: '#cffafe',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpeg,jpg,svg,woff2}'],
        // Zimmer-PNGs sind bis 1,8 MB groß — Standard-Limit (2 MB) knapp, daher angehoben
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        // API-Aufrufe (Zauber-Maler) nie cachen oder auf index.html umleiten
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
