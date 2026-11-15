import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

function normalizeBase(raw?: string): string {
  if (!raw || raw === '/') return '/';
  const withLeading = raw.startsWith('/') ? raw : `/${raw}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

export default defineConfig(() => {
  const base = normalizeBase(process.env.VITE_BASE_PATH);
  const shaPart = (process.env.GITHUB_SHA || '').slice(0, 8);
  const buildVersion = shaPart
    ? `${shaPart}_${Date.now().toString(36)}`
    : Date.now().toString(36);

  return {
    base,
    define: {
      __APP_ASSET_VERSION__: JSON.stringify(buildVersion),
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: base,
          name: 'ബിജു ചേട്ടന്റെ ഫ്രെഷ് മീൻ',
          short_name: 'ബിജു മീൻ',
          description: 'ഇന്നത്തെ മീൻ ലഭ്യതയും ഫോട്ടോകളും WhatsApp-ൽ പങ്കിടാൻ',
          lang: 'ml-IN',
          start_url: base,
          scope: base,
          display: 'standalone',
          display_override: ['standalone', 'minimal-ui'],
          orientation: 'portrait',
          background_color: '#f5f8fc',
          theme_color: '#082d59',
          icons: [
            {
              src: `${base}pwa-192x192.png`,
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: `${base}pwa-512x512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: `${base}pwa-maskable-512x512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // Precache lightweight app shell only (~1 MB) so SW updates never stall/fail on mobile
          globPatterns: [
            '**/*.{js,css,html,ico,svg,woff,woff2}',
            'pwa-*.png',
            'apple-touch-icon.png',
          ],
          globIgnores: [
            'assets/aistudio/**',
            'assets/catalog/**',
            '**/*.md',
            '**/*.txt',
            '**/*.example',
          ],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          ignoreURLParametersMatching: [/^v$/],
          navigateFallbackDenylist: [/\/assets\//],
          runtimeCaching: [
            {
              urlPattern: /\/assets\/(?:aistudio|catalog)\/.*\.(?:png|jpg|jpeg|webp)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'biju-fish-images-v3',
                expiration: {
                  maxEntries: 90,
                  maxAgeSeconds: 60 * 60 * 24 * 90,
                  purgeOnQuotaError: true,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          suppressWarnings: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
