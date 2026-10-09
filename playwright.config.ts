import { defineConfig } from '@playwright/test';
import { reuseStorefront, testPort, testUrl } from './tests/e2e/urls';
export default defineConfig({
  testDir: 'tests/e2e',
  testIgnore: [
    '**/vendor-live.spec.ts',
    '**/market-live.spec.ts',
    '**/storefront-live.spec.ts',
    '**/market-storefront-live.spec.ts',
    '**/checkout-account-live.spec.ts',
    '**/platform-admin-live.spec.ts',
  ],
  workers: 1,
  fullyParallel: false,
  use: {
    browserName: 'chromium',
    headless: true,
    screenshot: 'off',
    video: 'off',
    trace: 'off',
  },
  reporter:
    process.env.FRONTEND_NO_EVIDENCE === 'true'
      ? [['list']]
      : [
          ['list'],
          [
            'json',
            {
              outputFile: `${process.env.FRONTEND_EVIDENCE_DIR ?? 'docs/evidence/phase13c5'}/browser-results.json`,
            },
          ],
        ],
  webServer: [
    {
      command: `node ../../node_modules/astro/bin/astro.mjs dev --host 127.0.0.1 --port ${testPort(4321)}`,
      cwd: './apps/storefront',
      url: testUrl(4321),
      env: { FRONTEND_FIXTURE_MODE: 'true' },
      reuseExistingServer: reuseStorefront,
    },
    {
      command: `node ../../node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${testPort(4322)} --strictPort`,
      cwd: './apps/admin',
      url: testUrl(4322),
      env: { FRONTEND_FIXTURE_MODE: 'true' },
      reuseExistingServer: false,
    },
    {
      command: 'node apps/storefront/dist/server/entry.mjs',
      url: testUrl(4323) + '/assets/platform-mark.svg',
      env: {
        FRONTEND_FIXTURE_MODE: 'false',
        HOST: '127.0.0.1',
        PORT: String(testPort(4323)),
      },
      ignoreHTTPSErrors: false,
      reuseExistingServer: false,
    },
    {
      command: 'node scripts/preview-admin.ts',
      url: testUrl(4324),
      env: {
        FRONTEND_FIXTURE_MODE: 'false',
        FRONTEND_ADMIN_PREVIEW_PORT: String(testPort(4324)),
      },
      reuseExistingServer: false,
    },
  ],
});
