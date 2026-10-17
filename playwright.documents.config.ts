import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'documents-live.spec.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 60000,
  use: {
    browserName: 'chromium',
    headless: true,
    baseURL: 'http://localhost:4322',
    trace: 'off',
    video: 'off',
  },
  reporter: [['list']],
});
