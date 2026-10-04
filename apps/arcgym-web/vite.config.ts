import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { studioFsPlugin } from './vite/studioFsPlugin.ts';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const cfBeaconToken = env.VITE_CF_BEACON_TOKEN || process.env.VITE_CF_BEACON_TOKEN || '';
  const appRoot = import.meta.dirname;
  const repoRoot = path.resolve(appRoot, '../..');

  return {
    plugins: [
      react(),
      tailwindcss(),
      studioFsPlugin(repoRoot, path.join(appRoot, 'public')),
      {
        name: 'cloudflare-web-analytics',
        transformIndexHtml: {
          order: 'pre',
          handler(html) {
            // For multi-domain Cloudflare Pages deployments (e.g. arcgym.23p.tech and arcgym.23p.dev),
            // leave VITE_CF_BEACON_TOKEN unset so Cloudflare Pages automatically injects the beacon
            // script at the edge for all domains.
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
        '@': path.resolve(appRoot, './src'),
      },
    },
    server: {
      port: 3000,
    },
  };
});
