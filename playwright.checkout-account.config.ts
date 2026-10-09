import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'checkout-account-live.spec.ts',
  workers: 1,
  timeout: 120000,
  reporter: [['./scripts/checkout-terminal-reporter.ts']],
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
