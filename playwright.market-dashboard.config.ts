import { defineConfig } from '@playwright/test';
import { testPort, testUrl } from './tests/e2e/urls';

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'market.spec.ts',
  workers: 1,
  use: { channel: 'msedge', headless: true, reducedMotion: 'reduce' },
  reporter: [['list']],
  webServer: {
    command: `node ../../node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${testPort(4322)} --strictPort`,
    cwd: './apps/admin',
    url: testUrl(4322),
    env: { FRONTEND_FIXTURE_MODE: 'true' },
    reuseExistingServer: false,
  },
});
