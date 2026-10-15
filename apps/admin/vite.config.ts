import { defineConfig, loadEnv } from 'vite';
import tailwind from '@tailwindcss/vite';
import { validateEnvironment } from '@market/config';
export default defineConfig(({ mode, command }) => {
  const environment = { ...loadEnv(mode, '../..', ''), ...process.env };
  const config = validateEnvironment(
    environment,
    command === 'serve' && mode !== 'production' ? 'development' : 'production',
  );
  return {
    build: { sourcemap: false },
    envDir: '../..',
    plugins: [tailwind()],
    define: {
      __ADMIN_API_URL__: JSON.stringify(config.adminApiUrl),
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
