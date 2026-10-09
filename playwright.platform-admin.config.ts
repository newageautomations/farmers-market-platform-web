import { defineConfig } from '@playwright/test';
if (process.env.FRONTEND_NO_EVIDENCE !== 'true')
  throw new Error('Evidence suppression required');
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'platform-admin-live.spec.ts',
  workers: 1,
  timeout: 120000,
  reporter: [['list']],
  use: {
    actionTimeout: 30000,
    browserName: 'chromium',
    headless: true,
    screenshot: 'off',
    video: 'off',
    trace: 'off',
    launchOptions: {
      args: ['--host-resolver-rules=MAP *.localhost 127.0.0.1'],
    },
  },
});
