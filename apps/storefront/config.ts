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
