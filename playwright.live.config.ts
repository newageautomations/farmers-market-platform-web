import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'vendor-live.spec.ts',
  workers: 1,
  timeout: 60000,
  ...(process.env.FRONTEND_LIVE_PROFILE === 'unbound'
    ? { grep: /unconfigured capability/ }
    : { grepInvert: /unconfigured capability/ }),
  use: {
    browserName: 'chromium',
    headless: true,
    baseURL: 'http://127.0.0.1:4335',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  reporter:
    process.env.FRONTEND_NO_EVIDENCE === 'true'
      ? [['list']]
      : [
          ['list'],
          [
            'json',
            {
              outputFile: `${process.env.FRONTEND_EVIDENCE_DIR ?? 'docs/evidence/phase13c5'}/${process.env.FRONTEND_LIVE_PROFILE === 'unbound' ? 'live-unbound' : 'live'}-browser-results.json`,
            },
          ],
        ],
});
