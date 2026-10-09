import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'market-live.spec.ts',
  workers: 1,
  timeout: 90000,
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
              outputFile: `${process.env.FRONTEND_EVIDENCE_DIR ?? 'docs/evidence/phase13c5'}/live-market-browser-results.json`,
            },
          ],
        ],
});
