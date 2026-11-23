import { defineConfig } from 'vite';
import tailwind from '@tailwindcss/vite';
import {
  frontendBuildManifest,
  frontendBuildSettings,
  validateEnvironment,
} from '@market/config';
import { frontendToolingEnvironment } from '../../scripts/frontend-tooling.ts';
export default defineConfig(({ mode, command }) => {
  const { environment, envDir } = frontendToolingEnvironment(
    mode,
    command === 'build',
  );
  const config = validateEnvironment(
    environment,
    command === 'serve' ? 'development' : 'production',
    'build',
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
    envDir,
    plugins: [
      tailwind(),
      {
        name: 'market-admin-build-settings',
        apply: 'build',
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: frontendBuildManifest,
            source: JSON.stringify(frontendBuildSettings(config, 'admin')),
          });
        },
      },
    ],
    define: {
      // Remote demo: same-origin path, resolved against the page's own (tunnel)
      // origin, so a new Quick Tunnel hostname needs no admin restart.
      __ADMIN_API_URL__: JSON.stringify(
        remoteDemo ? '/admin-api' : config.adminApiUrl,
      ),
      __REMOTE_DEMO__: JSON.stringify(remoteDemo),
      __FIXTURE_MODE__: JSON.stringify(config.fixtureMode),
      __PLATFORM_ACCOUNT_ORIGIN__: JSON.stringify(config.accountOrigin),
      __CUSTOMER_STOREFRONT_ORIGIN__: JSON.stringify(config.customerOrigin),
    },
  };
});
