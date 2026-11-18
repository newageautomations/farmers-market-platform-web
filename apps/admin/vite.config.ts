import { defineConfig, loadEnv } from 'vite';
import tailwind from '@tailwindcss/vite';
import { validateEnvironment } from '@market/config';
export default defineConfig(({ mode, command }) => {
  const environment = { ...loadEnv(mode, '../..', ''), ...process.env };
  const config = validateEnvironment(
    environment,
    command === 'serve' && mode !== 'production' ? 'development' : 'production',
  );
  // Opt-in Cloudflare Quick Tunnel demo (scripts/remote-demo-admin.ts). Read
  // from the process only, never from .env, and only for the dev server.
  const remoteDemo =
    process.env.REMOTE_DEMO_ADMIN === 'true' &&
    command === 'serve' &&
    mode !== 'production'
      ? {
          admin: environment.ADMIN_ORIGIN ?? 'http://localhost:4322',
          vendure: new URL(config.adminApiUrl).origin,
          storefrontPort: Number(
            new URL(
              environment.PLATFORM_ACCOUNT_ORIGIN ??
                'http://auth.platform.localhost:4321',
            ).port,
          ),
        }
      : null;
  return {
    build: { sourcemap: false },
    envDir: '../..',
    plugins: [tailwind()],
    define: {
      // Remote demo: same-origin path, resolved against the page's own (tunnel)
      // origin, so a new Quick Tunnel hostname needs no admin restart.
      __ADMIN_API_URL__: JSON.stringify(
        remoteDemo ? '/admin-api' : config.adminApiUrl,
      ),
      __REMOTE_DEMO__: JSON.stringify(remoteDemo),
      __FIXTURE_MODE__: JSON.stringify(config.fixtureMode),
      __PLATFORM_ACCOUNT_ORIGIN__: JSON.stringify(
        environment.PLATFORM_ACCOUNT_ORIGIN ?? '',
      ),
      __CUSTOMER_STOREFRONT_ORIGIN__: JSON.stringify(
        environment.CUSTOMER_STOREFRONT_ORIGIN ?? '',
      ),
    },
  };
});
