import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/icon.svg'],
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
          {
            src: 'icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // App-Shell cache-first; die Kompetenzdatei wird ab Phase 2 eingebunden
        // (stale-while-revalidate, siehe spezifikation.md Abschnitt 2/4).
        globPatterns: ['**/*.{js,css,html,svg}'],
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
