import type { Server, RequestListener } from 'node:http';
import {
  validateEnvironment,
  runtimeMode,
  responseSecurityHeaders,
  cspDirectives,
} from '@market/config';
validateEnvironment(process.env, 'production');
if (runtimeMode(process.env) !== 'production')
  throw new Error('Production startup requires APP_ENV=production');
if (!process.env.SERVER_KEY_PATH || !process.env.SERVER_CERT_PATH)
  throw new Error('HTTPS certificate paths required');
process.env.ASTRO_NODE_AUTOSTART = 'disabled';
const entry = (await import(
  '../apps/storefront/dist/server/entry.mjs' as string
)) as {
  startServer(): { server: { server: Server }; done: Promise<void> };
};
const runtime = entry.startServer();
const server = runtime.server.server;
server.requestTimeout = 30000;
server.headersTimeout = 15000;
server.keepAliveTimeout = 5000;
const listeners = server.listeners('request');
if (listeners.length !== 1)
  throw new Error('Unexpected Astro request composition');
const adapterHandler = listeners[0] as RequestListener;
server.removeListener('request', adapterHandler);
let draining = false;
// Also protect adapter-level errors and static responses which precede Astro middleware.
// Rendered pages replace this fallback with Astro's framework-generated script hashes.
server.on('request', (request, response) => {
  for (const [name, value] of Object.entries(responseSecurityHeaders(true)))
    response.setHeader(name, value);
  response.setHeader('X-Request-Id', crypto.randomUUID());
  response.setHeader(
    'Content-Security-Policy',
    [
      ...cspDirectives(),
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
    ].join('; '),
  );
  const fail = (status: number, message: string) => {
    response.writeHead(status, {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    });
    response.end(message);
  };
  try {
    const authority = request.headers.host;
    if (!authority || /[%\\\s/@?#]/.test(authority)) throw new Error();
    const origin = new URL('https://' + authority);
    if (
      !origin.hostname ||
      origin.username ||
      origin.password ||
      origin.pathname !== '/' ||
      !request.url?.startsWith('/') ||
      request.url.startsWith('//')
    )
      throw new Error();
  } catch {
    fail(400, 'Invalid request authority.');
    return;
  }
  if (draining) {
    fail(503, 'Temporarily unavailable.');
    return;
  }
  try {
    adapterHandler.call(server, request, response);
  } catch {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        event: 'astro_adapter_failure',
        requestId: response.getHeader('X-Request-Id'),
      }),
    );
    if (!response.headersSent) fail(500, 'Request could not be completed.');
    else response.destroy();
  }
});
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.once(signal, () => {
    draining = true;
    server.close();
    server.closeIdleConnections();
    const deadline = setTimeout(() => {
      server.closeAllConnections();
      process.exitCode = 1;
    }, 30000);
    deadline.unref();
    void runtime.done.then(() => clearTimeout(deadline));
  });
await runtime.done;
