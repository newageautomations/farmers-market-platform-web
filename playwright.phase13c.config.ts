import { defineConfig } from '@playwright/test';
import base from './playwright.config';
import { testPort, testUrl, reuseStorefront } from './tests/e2e/urls';
export default defineConfig({
  ...base,
  webServer: [
    {
      command: `node ../../node_modules/astro/bin/astro.mjs dev --host 127.0.0.1 --port ${testPort(4321)}`,
      cwd: './apps/storefront',
      url: testUrl(4321),
      env: { FRONTEND_FIXTURE_MODE: 'true' },
      reuseExistingServer: reuseStorefront,
      timeout: 30000,
    },
    {
      command: `node ../../node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${testPort(4322)} --strictPort`,
      cwd: './apps/admin',
      url: testUrl(4322),
      env: { FRONTEND_FIXTURE_MODE: 'true' },
      reuseExistingServer: false,
      timeout: 30000,
    },
    ...(Array.isArray(base.webServer) ? base.webServer.slice(2) : []),
  ],
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile: `${process.env.FRONTEND_EVIDENCE_DIR ?? 'docs/evidence/phase13c5'}/browser-results.json`,
      },
    ],
  ],
});
