import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'market-storefront-live.spec.ts',
  workers: 1,
  timeout: 60000,
  reporter: [['list']],
  use: {
    browserName: 'chromium',
    headless: true,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    launchOptions: {
      args: ['--host-resolver-rules=MAP *.localhost 127.0.0.1'],
    },
  },
});
