import { defineConfig, loadEnv } from 'vite';
import tailwind from '@tailwindcss/vite';
import { validateEnvironment } from '@market/config';
export default defineConfig(({ mode, command }) => {
  const config = validateEnvironment(
    { ...loadEnv(mode, '../..', ''), ...process.env },
    command === 'serve' && mode !== 'production' ? 'development' : 'production',
  );
  return {
    build: { sourcemap: false },
    envDir: '../..',
    plugins: [tailwind()],
    define: {
      __ADMIN_API_URL__: JSON.stringify(config.adminApiUrl),
      __FIXTURE_MODE__: JSON.stringify(config.fixtureMode),
    },
  };
});
