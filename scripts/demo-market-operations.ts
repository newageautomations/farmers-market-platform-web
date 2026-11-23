import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { localAccountEnvironment } from './local-account-environment';
import { startDemoLanProxy } from './demo-lan-proxy';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.resolve(root, '../farmers-market-platform');
const action = process.argv[2] ?? '';
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run this helper through its npm script.');
const env = { ...process.env };
const configured = loadEnv('development', root, '');
for (const name of ['DEMO_LAN_IP', 'DEMO_LAN_PORT']) {
  if (env[name] === undefined && configured[name] !== undefined)
    env[name] = configured[name];
}
// All three servers must receive the same ignored development configuration.
// Forward only account settings to the backend, never frontend DB/provider values.
if (
  [
    'initialize-stock',
    'admin',
    'storefront',
    'serve',
    'worker',
    'migrate',
    'storefront-fixtures',
    'storefront-shop-fixtures',
    'willow-fixtures',
    'grant-willow-crm',
    'editorial-assets',
    'phase-a-fixtures',
    'packing-preorders',
    'attendance-today',
    'attendance-fixtures',
    'scheduling-fixtures',
    'phase-d-fixtures',
    'phase-c-fixtures',
    'phase-b-fixtures',
    'inspect',
    'taxonomy-c-fixtures',
    'team-permissions-fixtures',
    'team-invitations-fixtures',
    'team-invitations-api',
    'manna-team-fixtures',
    'manna-contact-fixtures',
    'market-discovery-fixtures',
    'finance-history-fixtures',
    'vendor-analytics-fixtures',
    'preorder-fee-fixtures',
    'market-day-storefront-ended-fixtures',
    'market-day-storefront-refresh-fixtures',
    'market-day-storefront-fixtures',
    'market-day-fixtures',
    'invoice-fixtures',
    'invoice-refund-fixtures',
    'stripe-connect-fixtures',
    'vendor-managed',
    'vendor-terms-fixtures',
  ].includes(action)
)
  Object.assign(
    env,
    localAccountEnvironment(loadEnv('development', root, ''), process.env),
  );
let args: string[];
if (['admin', 'storefront'].includes(action)) {
  Object.assign(env, {
    APP_ENV: 'dev',
    NODE_ENV: 'development',
    FRONTEND_FIXTURE_MODE: 'false',
    SHOP_API_URL: 'http://localhost:3000/shop-api',
    PUBLIC_ADMIN_API_URL: 'http://localhost:3000/admin-api',
    ASTRO_TELEMETRY_DISABLED: '1',
    DEMO_LOCAL_HOST_ALIASES: 'true',
  });
  args = ['run', `dev:${action}`];
  console.log(
    `Starting normal ${action} locally with fixture mode disabled and API http://localhost:3000.`,
  );
} else {
  if (
    ![
      'initialize-stock',
      'reset',
      'seed',
      'showcase',
      'serve',
      'worker',
      'migrate',
      'start-day',
      'verify',
      'storefront-fixtures',
      'storefront-shop-fixtures',
      'willow-fixtures',
      'grant-willow-crm',
      'editorial-assets',
      'phase-a-fixtures',
      'packing-preorders',
      'attendance-today',
      'attendance-fixtures',
      'scheduling-fixtures',
      'phase-d-fixtures',
      'phase-c-fixtures',
      'phase-b-fixtures',
      'inspect',
      'taxonomy-c-fixtures',
      'team-permissions-fixtures',
      'team-invitations-fixtures',
      'team-invitations-api',
      'manna-team-fixtures',
      'manna-contact-fixtures',
      'market-discovery-fixtures',
      'finance-history-fixtures',
      'vendor-analytics-fixtures',
      'preorder-fee-fixtures',
      'market-day-storefront-ended-fixtures',
      'market-day-storefront-refresh-fixtures',
      'market-day-storefront-fixtures',
      'market-day-fixtures',
      'invoice-fixtures',
      'invoice-refund-fixtures',
      'stripe-connect-fixtures',
      'vendor-managed',
      'vendor-terms-fixtures',
      'test',
    ].includes(action)
  )
    throw new Error('Unknown demo command.');
  if (!existsSync(path.join(backend, 'scripts/market-operations-demo/run.ts')))
    throw new Error(`Local backend demo tooling was not found at ${backend}`);
  args = ['--prefix', backend, 'run', `demo:market-operations:${action}`];
  if (['serve', 'worker'].includes(action))
    args = [path.join(root, 'scripts/demo-loyalty-runtime.cjs'), action];
  const extra = process.argv.slice(3);
  if (extra.length) args.push('--', ...extra);
  console.log(
    `Using sibling backend ${backend}. This command only targets its approved local demo database.`,
  );
}
if (action === 'serve') {
  await new Promise<void>((resolve, reject) => {
    const scanner = spawn(
      process.execPath,
      [npm, '--prefix', backend, 'run', 'documents:scanner:up'],
      { cwd: root, env, stdio: 'inherit', windowsHide: true },
    );
    scanner.on('error', reject);
    scanner.on('exit', (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(
              'ClamAV startup failed. Check Docker Desktop and scanner logs.',
            ),
          ),
    );
  });
}
const childArgs = ['serve', 'worker'].includes(action) ? args : [npm, ...args];
// Preserve all existing loopback origins and database guards. A local-only
// ingress adapts them for phones without changing saved storefront domains.
const lanProxy =
  action === 'storefront' ? await startDemoLanProxy(root, env) : undefined;
// Separate Vite base prevents Astro/admin dev module paths from colliding.
const lanAdmin =
  action === 'admin'
    ? spawn(
        process.execPath,
        [
          path.join(root, 'node_modules/vite/bin/vite.js'),
          '--host',
          '127.0.0.1',
          '--port',
          '4342',
          '--strictPort',
          '--base',
          '/__admin/',
        ],
        {
          cwd: path.join(root, 'apps/admin'),
          env: { ...env, REMOTE_DEMO_ADMIN: 'true' },
          stdio: 'inherit',
          windowsHide: true,
        },
      )
    : undefined;
function stopLan() {
  lanAdmin?.kill();
  lanProxy?.close();
  lanProxy?.closeAllConnections();
}
const child = spawn(process.execPath, childArgs, {
  cwd: root,
  env,
  stdio: 'inherit',
  windowsHide: true,
});
child.on('error', (error) => {
  stopLan();
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  stopLan();
  process.exitCode = code ?? 1;
});
lanAdmin?.on('error', (error) => {
  console.error(error.message);
  child.kill();
  stopLan();
  process.exitCode = 1;
});
lanAdmin?.on('exit', (code) => {
  if (code && !child.killed) {
    console.error(
      'The local Wi-Fi admin companion stopped. Restart the admin command.',
    );
    child.kill();
    process.exitCode = code;
  }
});
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
