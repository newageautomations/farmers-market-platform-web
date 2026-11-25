import type { RequestListener } from 'node:http';
import { statSync } from 'node:fs';
import { safeError } from '@market/api';
import {
  publicStorefrontResolver,
  resolveStorefront,
} from '@market/storefront-core';
import { hostedStorefrontRequest } from '@market/storefront-core/hosted-request';
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
  storefrontPrivateHeaders,
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
const privateApi = storefrontPrivateApi(process.env);
const accountHost = new URL(config.accountOrigin).host;
const routing =
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
const ready = frontendServer(listener, async (request, response) => {
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
  const host = authorizeFrontendRequest(
    request,
    response,
    listener,
    ready(),
    (host) => !routing || host === accountHost || routing.allows(host),
  );
  if (!host) return;
  let storefront;
  if (privateApi && host !== accountHost) {
    try {
      storefront = await resolveStorefront(
        {
          url: new URL(`https://${host}`),
          authority: host,
          fixtureMode: false,
          production: true,
        },
        publicStorefrontResolver(config.shopApiUrl, undefined, {
          origin: privateApi.origin,
          headers: storefrontPrivateHeaders(
            privateApi.key,
            request.socket.remoteAddress!,
          ),
        }),
      );
    } catch (error) {
      if (safeError(error).kind === 'not-found')
        return fail(404, 'Page unavailable.');
      console.info(
        JSON.stringify({
          event: 'storefront_resolution',
          kind: 'unavailable',
          timestamp: new Date().toISOString(),
          requestId: response.getHeader('X-Request-Id'),
        }),
      );
      return fail(503, 'Storefront unavailable.');
    }
  }
  if (storefrontPreviewDocument(request.url!))
    response.removeHeader('X-Frame-Options');
  try {
    if (storefront)
      hostedStorefrontRequest.run(storefront, entry.handler, request, response);
    else entry.handler(request, response);
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
