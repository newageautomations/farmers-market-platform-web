// Opt-in remote-demo ingress for a Cloudflare Quick Tunnel. Loopback only.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import {
  loadRemoteDemoConfig,
  startRemoteDemoProxy,
} from './remote-demo-proxy-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Only REMOTE_DEMO_* settings and the two non-secret local account/admin
// origins (internal identities the proxy maps to) are read from the root .env.
const env = {
  ...loadEnv('development', root, [
    'REMOTE_DEMO_',
    'ADMIN_ORIGIN',
    'PLATFORM_ACCOUNT_ORIGIN',
  ]),
  ...process.env,
};
const config = loadRemoteDemoConfig(env, root, (line) =>
  console.log(`[remote-demo] ${line}`),
);
const server = await startRemoteDemoProxy(config);
console.log(
  `[remote-demo] Proxy listening on http://127.0.0.1:${config.port} (loopback only).`,
);
console.log(
  config.publicOrigin()
    ? `[remote-demo] Accepting Host ${new URL(config.publicOrigin()!).host}.`
    : '[remote-demo] Waiting for `npm run demo:remote:tunnel` to report the Quick Tunnel origin; requests are refused until then.',
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => {
    server.close();
    server.closeAllConnections();
  });
