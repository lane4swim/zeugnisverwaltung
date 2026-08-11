import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative Pfade, damit der Build auch direkt per file:// oder aus einem
  // beliebigen Unterordner heraus geöffnet werden kann (siehe dist/-Ordner
  // für den Livetest im Browser).
  base: './',
  plugins: [
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-512-maskable.png'],
      manifest: {
        id: '/',
        name: 'Zeugnisverwaltung',
        short_name: 'Zeugnisse',
        description: 'Lokale Zeugnisverwaltung für NRW-Grundschulen – Schülerdaten verlassen nie den Rechner.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#2b4a6f',
        lang: 'de',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // App-Shell cache-first; die Kompetenzdatei wird über eine eigene
        // Netzwerk-zuerst/IndexedDB-Fallback-Logik behandelt (siehe
        // src/services/kompetenzdatei.ts), nicht über Workbox-Precaching.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: '/index.html',
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    host: true,
  },
});
