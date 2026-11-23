import { readFileSync, statSync } from 'node:fs';
import { resolve, sep, extname, basename } from 'node:path';
import {
  validateEnvironment,
  cspDirectives,
  responseSecurityHeaders,
  assertFrontendBuild,
  frontendBuildManifest,
  blocksIndexing,
  noIndexHeader,
  restrictiveRobots,
  validateDeploymentHost,
  storefrontEditorDocument,
} from '@market/config';
import { readFrontendBuild } from './frontend-build-manifest';
import { frontendListener, hostedFrontend } from '@market/config/hosted';
import {
  authorizeFrontendRequest,
  frontendServer,
} from './frontend-production-http';

const config = validateEnvironment(process.env, 'production', 'admin-runtime');
if (!config.production)
  throw new Error('Admin hosting wrapper requires production mode');
const root = resolve('apps/admin/dist');
assertFrontendBuild(
  readFrontendBuild(resolve(root, frontendBuildManifest)),
  config,
  'admin',
);
if (!statSync(resolve(root, 'index.html')).isFile())
  throw new Error('Missing Admin client build');
const listener = frontendListener(process.env, config.deployment, 'admin');
const adminHost = new URL(config.adminOrigin).host;
const policy = [
  ...cspDirectives({ adminApiOrigin: new URL(config.adminApiUrl).origin }),
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
].join('; ');
// Frame only exact configured storefronts, including newly admitted pilots.
const previewOrigins = listener.ingressKey
  ? [
      ...hostedFrontend(process.env, [
        config.adminOrigin,
        config.accountOrigin,
        new URL(config.adminApiUrl).origin,
      ]),
    ].map((host) => 'https://' + host)
  : (process.env.STOREFRONT_PREVIEW_ORIGINS ?? '')
      .split(',')
      .filter(Boolean)
      .map((value) => {
        const url = URL.parse(value.trim());
        if (!url || url.protocol !== 'https:' || url.origin !== value.trim())
          throw new Error('Preview origins require exact HTTPS origins');
        validateDeploymentHost(
          url.hostname,
          config.deployment,
          'STOREFRONT_PREVIEW_ORIGINS',
        );
        return url.origin;
      });
const ready = frontendServer(listener, (request, response) => {
  for (const [key, value] of Object.entries(responseSecurityHeaders(true)))
    response.setHeader(key, value);
  response.setHeader('X-Robots-Tag', noIndexHeader);
  response.setHeader('X-Request-Id', crypto.randomUUID());
  response.setHeader('Content-Security-Policy', policy);
  if (
    !authorizeFrontendRequest(
      request,
      response,
      listener,
      ready(),
      (host) => host === adminHost,
    )
  )
    return;
  const editorRoute = storefrontEditorDocument(
    new URL(request.url!, config.adminOrigin).pathname,
  );
  response.setHeader(
    'Content-Security-Policy',
    editorRoute && previewOrigins.length
      ? policy.replace(
          "frame-src 'none'",
          `frame-src ${previewOrigins.join(' ')}`,
        )
      : policy,
  );
  if (!['GET', 'HEAD'].includes(request.method ?? '')) {
    response.writeHead(405);
    response.end();
    return;
  }
  try {
    const pathname = decodeURIComponent(
      new URL(request.url!, config.adminOrigin).pathname,
    );
    let file = resolve(root, '.' + pathname);
    if (
      basename(file).startsWith('.') ||
      (file !== root && !file.startsWith(root + sep))
    ) {
      response.writeHead(404);
      response.end();
      return;
    }
    if (pathname === '/robots.txt' && blocksIndexing(config.deployment)) {
      response.setHeader('Content-Type', 'text/plain; charset=utf-8');
      response.end(request.method === 'HEAD' ? undefined : restrictiveRobots);
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
});
