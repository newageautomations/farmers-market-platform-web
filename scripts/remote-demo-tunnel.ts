// Starts a Cloudflare Quick Tunnel (no account, random trycloudflare.com URL)
// pointed at the loopback remote-demo proxy, then hands the exact origin to the
// proxy through an ignored local file. Separate from normal development startup.
import { spawn } from 'node:child_process';
import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { connect } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { requiresInjectedEnvironment } from '@market/config';
import {
  DEFAULT_PROXY_PORT,
  TUNNEL_ORIGIN_FILE,
  extractQuickTunnelOrigin,
  parsePort,
} from './remote-demo-proxy-core';

if (requiresInjectedEnvironment(process.env))
  throw new Error('Remote demo requires a local environment');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = {
  ...loadEnv('development', root, ['REMOTE_DEMO_', 'CLOUDFLARED_']),
  ...process.env,
};
const port = parsePort(env.REMOTE_DEMO_PROXY_PORT, DEFAULT_PROXY_PORT);
const originFile = path.join(root, TUNNEL_ORIGIN_FILE);

const listening = await new Promise<boolean>((resolve) => {
  const socket = connect({ host: '127.0.0.1', port }, () => {
    socket.end();
    resolve(true);
  });
  socket.on('error', () => resolve(false));
});
if (!listening) {
  console.error(
    `No remote-demo proxy on 127.0.0.1:${port}. Start \`npm run demo:remote:proxy\` first.`,
  );
  process.exit(1);
}

rmSync(originFile, { force: true });
let origin: string | undefined;
const binary = env.CLOUDFLARED_PATH || 'cloudflared';
const child = spawn(
  binary,
  ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${port}`],
  { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
);
function clear() {
  try {
    const current = JSON.parse(readFileSync(originFile, 'utf8')) as {
      origin?: string;
    };
    if (current.origin === origin) rmSync(originFile, { force: true });
  } catch {
    // Already removed.
  }
}
let buffered = '';
function scan(chunk: Buffer) {
  const text = chunk.toString('utf8');
  process.stderr.write(text.replace(/^/gm, '[cloudflared] '));
  if (origin) return;
  buffered = (buffered + text).slice(-4096);
  origin = extractQuickTunnelOrigin(buffered);
  if (!origin) return;
  mkdirSync(path.dirname(originFile), { recursive: true });
  const temporary = `${originFile}.${process.pid}.tmp`;
  writeFileSync(
    temporary,
    JSON.stringify({ origin, startedAt: new Date().toISOString() }),
  );
  renameSync(temporary, originFile);
  console.log(`\nRemote demo URL: ${origin}`);
  console.log(
    'Open it in any browser and enter REMOTE_DEMO_ACCESS_CODE. The URL changes every time this command restarts.\n',
  );
}
child.stdout.on('data', scan);
child.stderr.on('data', scan);
child.on('error', (error) => {
  console.error(
    (error as NodeJS.ErrnoException).code === 'ENOENT'
      ? `cloudflared was not found. Install it (winget install --id Cloudflare.cloudflared) or set CLOUDFLARED_PATH.`
      : error.message,
  );
  process.exitCode = 1;
});
child.on('exit', (code) => {
  clear();
  process.exitCode = code ?? 1;
});
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => {
    clear();
    child.kill();
  });
process.once('exit', clear);
