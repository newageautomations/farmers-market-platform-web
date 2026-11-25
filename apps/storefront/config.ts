import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import tailwind from '@tailwindcss/vite';
import { writeFile } from 'node:fs/promises';
import {
  validateEnvironment,
  cspDirectives,
  frontendBuildManifest,
  frontendBuildSettings,
} from '@market/config';
import { frontendToolingEnvironment } from '../../scripts/frontend-tooling.ts';
const development = process.argv.includes('dev');
const { environment, envDir } = frontendToolingEnvironment(
  development ? 'development' : 'production',
  process.argv.includes('build') || process.argv.includes('check'),
);
const config = validateEnvironment(
  environment,
  development ? 'development' : 'production',
  'build',
);
const build = frontendBuildSettings(config, 'storefront');
// Astro's dev import.meta env loader does not populate process.env. These are
// server-only account settings consumed by SSR; never add them to vite.define.
if (development) {
  for (const name of [
    'PLATFORM_ACCOUNT_ORIGIN',
    'PLATFORM_ACCOUNT_BRIDGE_KEY',
    'ADMIN_ORIGIN',
  ]) {
    if (environment[name] !== undefined) process.env[name] = environment[name];
  }
}
export default defineConfig({
  logger: config.production
    ? { entrypoint: './src/production-logger.mjs' }
    : undefined,
  security: {
    checkOrigin: true,
    allowedDomains: [],
    csp: config.production
      ? {
          directives: [
            ...cspDirectives({
              accountOrigin: config.accountOrigin,
              assetOrigin: config.assetOrigin,
            }),
          ],
          scriptDirective: { resources: ["'self'"] },
          // Theme custom properties and React style attributes need inline CSS. Executable scripts stay hashed.
          styleDirective: { resources: ["'self'", "'unsafe-inline'"] },
        }
      : undefined,
  },
  session: false,
  devToolbar: { enabled: false },
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    react(),
    {
      name: 'market-storefront-build-settings',
      hooks: {
        'astro:build:done': ({ dir }) =>
          writeFile(
            new URL(`../server/${frontendBuildManifest}`, dir),
            JSON.stringify(build),
          ),
      },
    },
  ],
  vite: {
    server: { strictPort: true },
    envDir,
    plugins: [tailwind()],
    build: {
      sourcemap: false,
      // Load the same request-local registry context as the hosted launcher.
      rolldownOptions: { external: ['@market/storefront-core/hosted-request'] },
    },
    define: {
      __STOREFRONT_HARDENED_BUILD__: JSON.stringify(config.production),
      __STOREFRONT_BUILD_SETTINGS__: JSON.stringify(build),
    },
  },
  server: { port: 4321, host: '127.0.0.1' },
});
