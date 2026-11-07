import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const base = process.env.APP_BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [VitePWA({
    injectRegister: 'script-defer',
    registerType: 'prompt',
    includeAssets: ['icon.svg', 'apple-touch-icon.png'],
    devOptions: { enabled: true, suppressWarnings: true, navigateFallbackAllowlist: [] },
    manifest: {
      id: base,
      name: 'Duo Lockscreen Creator',
      short_name: 'Duo Lockscreen Creator',
      description: 'Put a portrait and a landscape photo side by side for your lock screen.',
      start_url: base,
      scope: base,
      display: 'standalone',
      background_color: '#faf7f4',
      theme_color: '#faf7f4',
      icons: [
        { src: `${base}icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{html,js,css,woff2,png,svg}'],
      navigateFallback: `${base}index.html`,
      runtimeCaching: [],
      cleanupOutdatedCaches: true,
    },
  })],
  server: { host: '0.0.0.0', port: 43187, strictPort: true, watch: { usePolling: true, interval: 150 } },
});
