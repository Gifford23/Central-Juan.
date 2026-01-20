import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // ✅ Allow caching files up to 5 MB (default is 2 MB)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: 'HRIS System',
        short_name: 'HRIS',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0d6efd',
        icons: [
          {
            src: 'systemImage/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'systemImage/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    allowedHosts: [
      'phone-eos-correctly-bennett.trycloudflare.com',
    ],
    proxy: {
      '/api': {
        // target: 'http://localhost/central_juan/backend',
        target: 'https://hris.centraljuan.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
