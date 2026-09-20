import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// GitHub Pages serves project sites under /<repo>/. Set VITE_BASE=/ when
// you move to a custom domain.
const base = process.env.VITE_BASE ?? '/civil-preparation-app/';

export default defineConfig({
  base,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@content': fileURLToPath(new URL('./content', import.meta.url)),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'Civil Resilience App',
        short_name: 'Resilience',
        description: 'Get your household ready, one badge at a time.',
        theme_color: '#15181c',
        background_color: '#15181c',
        display: 'standalone',
        start_url: base,
        scope: base,
        lang: 'lt',
        icons: [
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Everything the app needs to work offline is precached.
        globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'],
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          {
            // Map tiles are online-only; cache what was seen for a week.
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 300, maxAgeSeconds: 7 * 24 * 3600 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
