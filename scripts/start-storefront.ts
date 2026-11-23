import type { RequestListener } from 'node:http';
import { statSync } from 'node:fs';
import {
  validateEnvironment,
  assertFrontendBuild,
  frontendBuildManifest,
  blocksIndexing,
  noIndexHeader,
  responseSecurityHeaders,
  cspDirectives,
  storefrontPreviewDocument,
} from '@market/config';
import { readFrontendBuild } from './frontend-build-manifest';
import {
  frontendListener,
  hostedFrontend,
  storefrontPrivateApi,
} from '@market/config/hosted';
import {
  authorizeFrontendRequest,
  frontendServer,
} from './frontend-production-http';
const config = validateEnvironment(process.env, 'production');
if (!config.production)
  throw new Error('Production startup requires APP_ENV=production');
assertFrontendBuild(
  readFrontendBuild(
    new URL(
      `../apps/storefront/dist/server/${frontendBuildManifest}`,
      import.meta.url,
    ),
  ),
  config,
  'storefront',
);
const listener = frontendListener(process.env, config.deployment, 'storefront');
storefrontPrivateApi(process.env);
const accountHost = new URL(config.accountOrigin).host;
const pilots =
  listener.ingressKey &&
  hostedFrontend(process.env, [
    config.adminOrigin,
    config.accountOrigin,
    new URL(config.adminApiUrl).origin,
  ]);
process.env.ASTRO_NODE_AUTOSTART = 'disabled';
const entry = (await import(
  '../apps/storefront/dist/server/entry.mjs' as string
)) as {
  handler: RequestListener;
};
if (typeof entry.handler !== 'function')
  throw new Error('Missing Astro standalone request handler');
if (
  !statSync(
    new URL('../apps/storefront/dist/client/', import.meta.url),
  ).isDirectory()
)
  throw new Error('Missing Astro client build');
// Also protect adapter-level errors and static responses which precede Astro middleware.
// Rendered pages replace this fallback with Astro's framework-generated script hashes.
const ready = frontendServer(listener, (request, response) => {
  for (const [name, value] of Object.entries(responseSecurityHeaders(true)))
    response.setHeader(name, value);
  if (blocksIndexing(config.deployment))
    response.setHeader('X-Robots-Tag', noIndexHeader);
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
      'X-Robots-Tag': noIndexHeader,
    });
    response.end(message);
  };
  if (
    !authorizeFrontendRequest(
      request,
      response,
      listener,
      ready(),
      (host) => !pilots || host === accountHost || pilots.has(host),
    )
  )
    return;
  if (storefrontPreviewDocument(request.url!))
    response.removeHeader('X-Frame-Options');
  try {
    entry.handler(request, response);
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
