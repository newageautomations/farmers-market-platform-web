import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import tailwind from '@tailwindcss/vite';
import { loadEnv } from 'vite';
import {
  validateEnvironment,
  cspDirectives,
  runtimeMode,
} from '@market/config';
const development = process.argv.includes('dev');
const environment = {
  ...loadEnv(development ? 'development' : 'production', '../..', ''),
  ...process.env,
};
validateEnvironment(environment, development ? 'development' : 'production');
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
  logger:
    runtimeMode(environment) === 'production'
      ? { entrypoint: './src/production-logger.mjs' }
      : undefined,
  security: {
    checkOrigin: true,
    allowedDomains: [],
    csp:
      runtimeMode(environment) === 'production'
        ? {
            directives: [
              ...cspDirectives(
                runtimeMode(environment) === 'production'
                  ? {
                      accountOrigin: environment.PLATFORM_ACCOUNT_ORIGIN,
                      assetOrigin: environment.ASSET_URL_PREFIX
                        ? new URL(environment.ASSET_URL_PREFIX).origin
                        : undefined,
                    }
                  : {},
              ),
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
  integrations: [react()],
  vite: {
    server: { strictPort: true },
    envDir: '../..',
    plugins: [tailwind()],
    build: { sourcemap: false },
    define: {
      __PRODUCTION_BUILD__: JSON.stringify(
        runtimeMode(environment) === 'production',
      ),
      __PRODUCTION_CSP_ORIGINS__: JSON.stringify({
        account: environment.PLATFORM_ACCOUNT_ORIGIN ?? '',
        asset: environment.ASSET_URL_PREFIX
          ? new URL(environment.ASSET_URL_PREFIX).origin
          : '',
      }),
    },
  },
  server: { port: 4321, host: '127.0.0.1' },
});
