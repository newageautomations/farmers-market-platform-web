import { randomBytes } from 'node:crypto';
import { demoLanAddress } from './demo-lan-network';
import { createDemoLanEntry } from './demo-lan-entry';
import {
  loadRemoteDemoConfig,
  parsePort,
  startRemoteDemoProxy,
} from './remote-demo-proxy-core';

/** Reuse the local origin/cookie adapter without starting any tunnel or external service. */
export async function startDemoLanProxy(
  root: string,
  env: Record<string, string | undefined>,
) {
  const address = demoLanAddress(env.DEMO_LAN_IP);
  if (!address) {
    console.warn(
      'No private LAN IPv4 address found. Localhost remains available. Set DEMO_LAN_IP to select a network adapter.',
    );
    return;
  }
  const port = parsePort(env.DEMO_LAN_PORT, 8791);
  if ([4321, 4322].includes(port))
    throw new Error(
      'DEMO_LAN_PORT must differ from the frontend entry ports 4321 and 4322.',
    );
  const origin = `http://${address}:${port}`;
  const config = loadRemoteDemoConfig(
    {
      REMOTE_DEMO_ACCESS_CODE: randomBytes(32).toString('hex'),
      PLATFORM_ACCOUNT_ORIGIN: env.PLATFORM_ACCOUNT_ORIGIN,
      ADMIN_ORIGIN: env.ADMIN_ORIGIN,
    },
    root,
    (line) => console.log(`[demo-lan] ${line}`),
  );
  const server = await startRemoteDemoProxy({
    ...config,
    port,
    lanAddress: address,
    publicOrigin: () => origin,
  });
  const entries = [
    createDemoLanEntry(origin, 'storefront'),
    createDemoLanEntry(origin, 'admin'),
  ];
  try {
    for (const [index, entry] of entries.entries()) {
      await new Promise<void>((resolve, reject) => {
        entry.once('error', reject);
        entry.listen(4321 + index, address, resolve);
      });
    }
  } catch (error) {
    for (const entry of entries) {
      entry.closeAllConnections();
      entry.close();
    }
    server.closeAllConnections();
    server.close();
    throw error;
  }
  server.once('close', () => {
    for (const entry of entries) {
      entry.closeAllConnections();
      entry.close();
    }
  });
  console.log(`Wi-Fi demo URLs (run serve, worker, admin and storefront):
Main storefront: http://${address}:4321/
Dashboard: http://${address}:4322/
Account: ${origin}/account/login
Vendor dashboard: ${origin}/vendor
Market dashboard: ${origin}/market
Storefront: ${origin}/store/localhost/
Vendor/market sites: ${origin}/store/<site>/ (for example /store/manna-roots/)
Keep this terminal open. LAN HTTP is for trusted local networks.`);
  return server;
}
