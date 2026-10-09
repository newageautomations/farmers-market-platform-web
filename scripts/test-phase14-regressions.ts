import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
assert.equal(process.env.FRONTEND_NO_EVIDENCE, 'true');
const suites = [
  [
    'Fixture browser regressions',
    ['node_modules/@playwright/test/cli.js', 'test', '--reporter=list'],
  ],
  ['Vendor Admin', ['--import', 'tsx', 'scripts/test-live.ts']],
  ['Market Admin', ['--import', 'tsx', 'scripts/test-live.ts', '--market']],
  [
    'Vendor Storefront',
    ['--import', 'tsx', 'scripts/test-vendor-storefront.ts'],
  ],
  [
    'Market Storefront',
    ['--import', 'tsx', 'scripts/test-market-storefront.ts'],
  ],
  [
    'Checkout account and SSO',
    ['--import', 'tsx', 'scripts/test-checkout-account.ts'],
  ],
  ['Platform Admin', ['--import', 'tsx', 'scripts/test-platform-admin.ts']],
] as const;
let passed = 0,
  failed = 0;
for (const [name, args] of suites) {
  const p = spawn(process.execPath, [...args], {
    cwd: process.cwd(),
    windowsHide: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      APP_ENV: 'test',
      DB_HOST: '127.0.0.1',
      FRONTEND_NO_EVIDENCE: 'true',
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --require="${resolve('scripts/playwright-no-evidence.cjs').replaceAll('\\', '/')}"`,
    },
  });
  const code = await new Promise<number>((accept, reject) => {
    p.once('error', reject);
    p.once('exit', (code) => accept(code ?? 1));
  });
  if (code === 0) {
    passed++;
    console.log('FRONTEND REGRESSION PASS ' + name);
  } else {
    failed++;
    console.log('FRONTEND REGRESSION FAIL ' + name + ' exit ' + code);
  }
}
console.log(
  `Frontend browser regression totals: ${passed} passed, ${failed} failed (${suites.length} commands)`,
);
if (failed) process.exitCode = 1;
