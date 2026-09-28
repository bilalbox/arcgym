import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const cfBeaconToken = env.VITE_CF_BEACON_TOKEN || process.env.VITE_CF_BEACON_TOKEN || '';

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'cloudflare-web-analytics',
        transformIndexHtml: {
          order: 'pre',
          handler(html) {
            const scriptTag = cfBeaconToken
              ? `<!-- Cloudflare Web Analytics -->\n    <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${cfBeaconToken}", "spa": true}'></script>\n    <!-- End Cloudflare Web Analytics -->`
              : '<!-- Cloudflare Web Analytics: auto-injected at edge by Cloudflare Pages -->';
            return html.replace(/<!-- CF_ANALYTICS_BEACON -->/g, scriptTag);
          },
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      port: 3000,
    },
  };
});
