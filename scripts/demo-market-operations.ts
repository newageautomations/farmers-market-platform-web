import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.resolve(root, '../farmers-market-platform');
const action = process.argv[2] ?? '';
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run this helper through its npm script.');
const env = { ...process.env };
let args: string[];
if (['admin', 'storefront'].includes(action)) {
  Object.assign(env, {
    APP_ENV: 'dev',
    NODE_ENV: 'development',
    FRONTEND_FIXTURE_MODE: 'false',
    SHOP_API_URL: 'http://localhost:3000/shop-api',
    PUBLIC_ADMIN_API_URL: 'http://localhost:3000/admin-api',
    PLATFORM_ACCOUNT_ORIGIN: 'http://auth.platform.localhost:4321',
    PLATFORM_ACCOUNT_BRIDGE_KEY: '',
    ASTRO_TELEMETRY_DISABLED: '1',
  });
  args = ['run', `dev:${action}`];
  console.log(
    `Starting normal ${action} locally with fixture mode disabled and API http://localhost:3000.`,
  );
} else {
  if (
    ![
      'reset',
      'seed',
      'showcase',
      'serve',
      'start-day',
      'verify',
      'test',
    ].includes(action)
  )
    throw new Error('Unknown demo command.');
  if (!existsSync(path.join(backend, 'scripts/market-operations-demo/run.ts')))
    throw new Error(`Local backend demo tooling was not found at ${backend}`);
  args = ['--prefix', backend, 'run', `demo:market-operations:${action}`];
  const extra = process.argv.slice(3);
  if (extra.length) args.push('--', ...extra);
  console.log(
    `Using sibling backend ${backend}. This command only targets its approved local demo database.`,
  );
}
const child = spawn(process.execPath, [npm, ...args], {
  cwd: root,
  env,
  stdio: 'inherit',
  windowsHide: true,
});
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
