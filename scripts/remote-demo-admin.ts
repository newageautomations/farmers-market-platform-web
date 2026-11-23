// A second, opt-in admin Vite dev server for the remote demo. Its modules live
// under /__admin/ so they cannot collide with Astro dev's /@vite, /src and
// /node_modules paths on the single tunnel origin. Normal `demo:market-operations:admin`
// on :4322 is unchanged. Uses the same guarded account settings; its browser
// API is the same-origin /admin-api route of the tunnel (no restart per URL).
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { requiresInjectedEnvironment } from '@market/config';
import { localAccountEnvironment } from './local-account-environment';
import {
  ADMIN_BASE,
  DEFAULT_REMOTE_ADMIN_PORT,
  parsePort,
} from './remote-demo-proxy-core';

if (requiresInjectedEnvironment(process.env))
  throw new Error('Remote demo requires a local environment');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vite = path.join(root, 'node_modules/vite/bin/vite.js');
if (!existsSync(vite))
  throw new Error('Install dependencies first (vite not found).');
const port = parsePort(
  process.env.REMOTE_DEMO_ADMIN_PORT ??
    loadEnv('development', root, 'REMOTE_DEMO_').REMOTE_DEMO_ADMIN_PORT,
  DEFAULT_REMOTE_ADMIN_PORT,
);
const env = {
  ...process.env,
  ...localAccountEnvironment(loadEnv('development', root, ''), process.env),
  APP_ENV: 'dev',
  NODE_ENV: 'development',
  FRONTEND_FIXTURE_MODE: 'false',
  SHOP_API_URL: 'http://localhost:3000/shop-api',
  // The local endpoint stays the validated configuration and the identity for
  // asset URLs; with REMOTE_DEMO_ADMIN the browser calls same-origin /admin-api
  // on whatever tunnel hostname serves the page (apps/admin/vite.config.ts).
  PUBLIC_ADMIN_API_URL: 'http://localhost:3000/admin-api',
  REMOTE_DEMO_ADMIN: 'true',
};
console.log(
  `Starting remote-demo admin on http://127.0.0.1:${port}${ADMIN_BASE}/ (loopback only).`,
);
const child = spawn(
  process.execPath,
  [
    vite,
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
    '--base',
    `${ADMIN_BASE}/`,
  ],
  {
    cwd: path.join(root, 'apps/admin'),
    env,
    stdio: 'inherit',
    windowsHide: true,
  },
);
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
