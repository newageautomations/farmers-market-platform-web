import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'vendor.spec.ts',
  workers: 1,
  use: {
    browserName: 'chromium',
    headless: true,
    baseURL: 'http://127.0.0.1:4332',
  },
  reporter: [
    ['list'],
    [
      'json',
      { outputFile: 'docs/evidence/phase13b5/vendor-browser-results.json' },
    ],
  ],
  webServer: [
    {
      command:
        'node ../../node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4332 --strictPort',
      cwd: './apps/admin',
      url: 'http://127.0.0.1:4332',
      env: { FRONTEND_FIXTURE_MODE: 'true' },
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
});
