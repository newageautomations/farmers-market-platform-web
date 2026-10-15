import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@tailwindcss/vite';
import { assertGalleryEnvironment } from '../../../scripts/ui-gallery-policy.ts';

export default defineConfig({
  integrations: [
    {
      name: 'local-ui-gallery-only',
      hooks: {
        'astro:config:setup': ({ command }) => {
          assertGalleryEnvironment(command, process.env);
        },
      },
    },
    react(),
  ],
  devToolbar: { enabled: false },
  server: { host: '127.0.0.1', port: 4343 },
  vite: {
    // This standalone fixture has no workspace manifest for Astro's dependency crawler.
    ssr: { noExternal: ['astro', '@astrojs/react'] },
    envDir: false,
    server: { strictPort: true, hmr: false },
    plugins: [tailwind()],
  },
});
