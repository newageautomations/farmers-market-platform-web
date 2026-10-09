import { createServer } from 'node:https';
import { readFileSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import {
  validateEnvironment,
  cspDirectives,
  responseSecurityHeaders,
  runtimeMode,
} from '@market/config';

const config = validateEnvironment(process.env, 'production');
if (runtimeMode(process.env) !== 'production')
  throw new Error('Admin hosting wrapper requires production mode');
if (!process.env.SERVER_KEY_PATH || !process.env.SERVER_CERT_PATH)
  throw new Error('HTTPS certificate paths required');
const root = resolve('apps/admin/dist');
const policy = [
  ...cspDirectives({ adminApiOrigin: new URL(config.adminApiUrl).origin }),
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
].join('; ');
const server = createServer(
  {
    key: readFileSync(process.env.SERVER_KEY_PATH),
    cert: readFileSync(process.env.SERVER_CERT_PATH),
  },
  (request, response) => {
    for (const [key, value] of Object.entries(responseSecurityHeaders(true)))
      response.setHeader(key, value);
    response.setHeader('Content-Security-Policy', policy);
    response.setHeader('X-Robots-Tag', 'noindex, nofollow');
    response.setHeader('X-Request-Id', crypto.randomUUID());
    if (request.headers.host !== new URL(process.env.ADMIN_ORIGIN!).host) {
      response.writeHead(421);
      response.end('Host unavailable');
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method ?? '')) {
      response.writeHead(405);
      response.end();
      return;
    }
    try {
      const pathname = decodeURIComponent(
        new URL(request.url!, process.env.ADMIN_ORIGIN).pathname,
      );
      let file = resolve(root, '.' + pathname);
      if (file !== root && !file.startsWith(root + sep)) {
        response.writeHead(404);
        response.end();
        return;
      }
      if (!extname(pathname)) file = resolve(root, 'index.html');
      if (!statSync(file).isFile()) {
        response.writeHead(404);
        response.end();
        return;
      }
      const type: Record<string, string> = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.woff2': 'font/woff2',
      };
      response.setHeader(
        'Content-Type',
        type[extname(file)] ?? 'application/octet-stream',
      );
      response.end(request.method === 'HEAD' ? undefined : readFileSync(file));
    } catch {
      response.writeHead(404);
      response.end('Resource unavailable');
    }
  },
);
server.requestTimeout = 30000;
server.headersTimeout = 15000;
server.keepAliveTimeout = 5000;
server.listen(Number(process.env.ADMIN_PORT ?? 4341), '127.0.0.1');
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.once(signal, () => {
    server.close();
    server.closeIdleConnections();
  });
