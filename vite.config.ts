import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { contentPlugin } from './scripts/lib/vite-plugin-content.ts';

// Relative base so the build works from any sub-path (e.g. GitHub Pages /cpp-hero/).
export default defineConfig({
  base: './',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    rollupOptions: {
      output: {
        // All of the Firebase SDK in one lazily loaded chunk (see src/cloud/CloudProvider.tsx).
        manualChunks(id) {
          if (/\/node_modules\/(@firebase|firebase)\//.test(id)) return 'firebase';
          return undefined;
        },
      },
    },
  },
  plugins: [
    contentPlugin(),
    react(),
    VitePWA({
      // The app shows its own "new version, refresh?" prompt (src/app/pwa.ts):
      // with 'prompt' the new worker waits until the user accepts.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Cpp Hero',
        short_name: 'Cpp Hero',
        description: 'Learn C++ from zero. Defend your code. A game-like course in modern, safe C++.',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FFF4E6',
        theme_color: '#F2641B',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // Offline: precache the whole app shell (the content is bundled into the JS).
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // The Firebase chunk (only built when VITE_FIREBASE_* is set) is not
        // precached, so guests never download it; signed-in devices cache it
        // on first use (runtime rule below).
        globIgnores: ['**/node_modules/**/*', '**/firebase-*.js'],
        navigateFallback: 'index.html',
        // Never answer Firebase auth handler pages (/__/auth/*, when proxied
        // through this domain) with the app shell.
        navigateFallbackDenylist: [/^\/__\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Hashed file name: safe to cache forever.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/assets\/firebase-[\w-]+\.js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'cpphero-firebase', expiration: { maxEntries: 4 } },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'cpphero-fonts-css' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'cpphero-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
