import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const backend = resolve('../farmers-market-platform'),
  mode = process.argv[2] ?? 'test';
if (
  ![
    'test',
    'seed',
    'verify',
    'serve',
    'remove',
    'admin',
    'storefront',
    'quickbooks-migrate',
    'quickbooks-tax-fixture',
  ].includes(mode)
)
  throw new Error('Unknown finance action');
if (mode === 'admin' || mode === 'storefront') {
  const env = {
    ...process.env,
    APP_ENV: 'dev',
    NODE_ENV: 'development',
    FRONTEND_FIXTURE_MODE: 'false',
    PUBLIC_ADMIN_API_URL: 'http://localhost:3096/admin-api',
    SHOP_API_URL: 'http://localhost:3096/shop-api',
    PLATFORM_ACCOUNT_ORIGIN: 'http://auth.platform.localhost:4378',
    PLATFORM_ACCOUNT_BRIDGE_KEY: 'pos-disposable-bridge-key-only-4368',
    ADMIN_ORIGIN: 'http://localhost:4596',
    ASTRO_TELEMETRY_DISABLED: '1',
  };
  const child = spawn(
    process.execPath,
    mode === 'admin'
      ? [
          resolve('node_modules/vite/bin/vite.js'),
          '--host',
          'localhost',
          '--port',
          '4596',
          '--strictPort',
        ]
      : [
          '--input-type=module',
          '-e',
          "import {dev} from 'astro';await dev({server:{host:'127.0.0.1',port:4378}})",
        ],
    { cwd: resolve(`apps/${mode}`), env, stdio: 'inherit', windowsHide: true },
  );
  child.on('exit', (c) => {
    process.exitCode = c ?? 1;
  });
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
} else {
  const dir = resolve('docs/financial-reporting');
  mkdirSync(dir, { recursive: true });
  const output = createWriteStream(resolve(dir, `${mode}.log`));
  const child = spawn(
    process.execPath,
    [
      '--require',
      './test/no-evidence.cjs',
      'node_modules/ts-node/dist/bin.js',
      '--project',
      'test/financial-reporting/tsconfig.json',
      mode === 'quickbooks-tax-fixture'
        ? 'test/quickbooks/taxable-fixture.ts'
        : 'test/financial-reporting/run.ts',
      mode,
    ],
    {
      cwd: backend,
      env: {
        ...process.env,
        APP_ENV: 'test',
        NODE_ENV: 'test',
        FRONTEND_NO_EVIDENCE: 'true',
        POS_DEMO_ADMIN_PORT: '4596',
        POS_DEMO_STOREFRONT_PORT: '4378',
        DB_HOST: '127.0.0.1',
        VENDURE_DISABLE_TELEMETRY: 'true',
      },
      stdio: ['inherit', 'pipe', 'pipe'],
      windowsHide: true,
    },
  );
  child.stdout.on('data', (b) => {
    process.stdout.write(b);
    output.write(b);
  });
  child.stderr.on('data', (b) => {
    process.stderr.write(b);
    output.write(b);
  });
  child.on('error', (e) => {
    console.error(e);
    process.exitCode = 1;
    output.end();
  });
  child.on('exit', (c) => {
    output.end();
    process.exitCode = c ?? 1;
  });
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
}
