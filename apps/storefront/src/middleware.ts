import { defineMiddleware } from 'astro:middleware';
import {
  resolveStorefront,
  publicStorefrontResolver,
} from '@market/storefront-core';
import { safeError } from '@market/api';
import {
  validateEnvironment,
  deploymentEnvironment,
  assertFrontendBuild,
  blocksIndexing,
  noIndexHeader,
  responseSecurityHeaders,
  cspDirectives,
  storefrontPreviewDocument,
} from '@market/config';
import { isCentral } from './lib/account';
import {
  editorOrigin,
  editorPreviewConnectSource,
} from './lib/editor-preview-server';
import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { centralAccountPath } from '@market/config/hosted';
import {
  apiRequestAddress,
  resolverTransport,
  shopTransportEndpoint,
} from './lib/private-api';

// The built SSR module also fails closed when started without the convenience wrapper.
declare const __STOREFRONT_HARDENED_BUILD__: boolean;
declare const __STOREFRONT_BUILD_SETTINGS__: unknown;
const hardenedConfig =
  __STOREFRONT_HARDENED_BUILD__ || process.env.APP_ENV === 'production'
    ? validateEnvironment(process.env, 'production')
    : undefined;
const hosted = process.env.HOSTED_TRANSPORT === 'railway-private';
if (hosted && process.env.ASTRO_NODE_AUTOSTART !== 'disabled')
  throw new Error('Hosted Astro requires the production launcher');
if (hardenedConfig)
  assertFrontendBuild(
    __STOREFRONT_BUILD_SETTINGS__,
    hardenedConfig,
    'storefront',
  );

// Supplementary, bounded process-local limit. Backend durable account limits remain authoritative.
const requests = new Map<string, { expires: number; count: number }>();
function allowed(key: string) {
  const now = Date.now();
  let row = requests.get(key);
  if (!row || row.expires <= now) {
    if (requests.size >= 10000)
      for (const [k, r] of requests) if (r.expires <= now) requests.delete(k);
    if (!requests.has(key) && requests.size >= 10000) return false;
    row = { expires: now + 60000, count: 0 };
    requests.set(key, row);
  }
  return ++row.count <= 120;
}
export const onRequest = defineMiddleware((context, next) => {
  if (!hosted || apiRequestAddress.getStore())
    return renderRequest(context, next);
  const address = context.clientAddress;
  if (!isIP(address)) return new Response('Request denied.', { status: 403 });
  return apiRequestAddress.run(address, () => renderRequest(context, next));
});

const renderRequest = defineMiddleware(async (context, next) => {
  const requestId = crypto.randomUUID();
  const { mode, deployment } = deploymentEnvironment(
    process.env,
    process.env.NODE_ENV === 'test' ? 'test' : 'dev',
  );
  const production = mode === 'production';
  context.locals.deployment = deployment;
  // The populated demo registers localhost, not the numeric loopback authority.
  // Canonicalize browser navigation only; preserve POST origin checks and production routing.
  if (
    !production &&
    process.env.DEMO_LOCAL_HOST_ALIASES === 'true' &&
    context.url.hostname === '127.0.0.1' &&
    ['GET', 'HEAD'].includes(context.request.method)
  ) {
    const target = new URL(context.url);
    target.hostname = 'localhost';
    return context.redirect(target.href, 302);
  }
  const headers = new Headers(responseSecurityHeaders(production));
  if (
    context.url.pathname === '/account/invitation' &&
    context.url.searchParams.has('token')
  )
    headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Request-Id', requestId);
  const privateRoute =
    /^\/(account|auth|checkout|api|notifications)(\/|$)/.test(
      context.url.pathname,
    );
  if (privateRoute || blocksIndexing(deployment))
    headers.set('X-Robots-Tag', noIndexHeader);
  async function finish(response: Response) {
    if (
      storefrontPreviewDocument(context.url.pathname) ||
      context.locals.editorPreview
    ) {
      headers.delete('X-Frame-Options');
      headers.set('X-Robots-Tag', noIndexHeader);
      // no-referrer makes a browser form's Origin opaque (null), which Astro
      // correctly rejects before this middleware. Origin-only referrers expose no draft/token.
      headers.set('Referrer-Policy', 'strict-origin');
      // This exception is restricted to preview responses. All public pages retain DENY.
      let policy =
        response.headers.get('Content-Security-Policy') ??
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: http://localhost:* http://*.localhost:*; font-src 'self'; object-src 'none'; base-uri 'none'";
      if (
        !response.headers.has('Content-Security-Policy') &&
        response.headers.get('Content-Type')?.includes('text/html')
      ) {
        // Astro's dev server does not emit its build-time CSP hashes. Permit only the
        // exact inline runtime scripts in this trusted SSR response, including islands.
        const html = await response.clone().text();
        const hashes = [
          ...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi),
        ]
          .filter(
            (match) =>
              !/\bsrc\s*=|\btype\s*=\s*["']application\//i.test(match[1]!),
          )
          .map(
            (match) =>
              `'sha256-${createHash('sha256').update(match[2]!).digest('base64')}'`,
          );
        policy = policy.replace(
          "script-src 'self'",
          `script-src 'self' ${hashes.join(' ')}`,
        );
      }
      response.headers.set(
        'Content-Security-Policy',
        policy
          .split(';')
          .filter(
            (p) =>
              !/^\s*(frame-ancestors|form-action|connect-src|frame-src)\s/.test(
                p,
              ),
          )
          .concat([
            `frame-ancestors ${editorOrigin()}`,
            `form-action ${context.url.origin}/storefront-editor-preview/render`,
            "frame-src 'none'",
            editorPreviewConnectSource(
              context.url,
              import.meta.env.DEV && !production,
            ),
          ])
          .join('; '),
      );
    }
    for (const [key, value] of headers) response.headers.set(key, value);
    if (response.status >= 400)
      response.headers.set('X-Robots-Tag', noIndexHeader);
    if (
      production &&
      !import.meta.env.DEV &&
      !response.headers.has('Content-Security-Policy')
    )
      response.headers.set(
        'Content-Security-Policy',
        [
          ...cspDirectives(),
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
        ].join('; '),
      );
    return response;
  }
  try {
    const config =
      hardenedConfig ??
      validateEnvironment(
        {
          ...process.env,
          SHOP_API_URL:
            process.env.SHOP_API_URL ?? import.meta.env.SHOP_API_URL,
          PUBLIC_ADMIN_API_URL:
            process.env.PUBLIC_ADMIN_API_URL ??
            import.meta.env.PUBLIC_ADMIN_API_URL,
          FRONTEND_FIXTURE_MODE:
            process.env.FRONTEND_FIXTURE_MODE ??
            import.meta.env.FRONTEND_FIXTURE_MODE,
        },
        import.meta.env.DEV ? 'development' : 'production',
      );
    context.locals.shopApiUrl = shopTransportEndpoint(config.shopApiUrl);
    // Astro allowedDomains is empty. Security decisions never consume forwarded headers.
    if (production && context.url.protocol !== 'https:')
      return finish(new Response('HTTPS is required.', { status: 400 }));
    if (
      context.request.method !== 'GET' &&
      context.request.method !== 'HEAD' &&
      context.request.headers.get('origin') !== context.url.origin
    )
      return finish(new Response('Request denied.', { status: 403 }));
    if (blocksIndexing(deployment) && context.url.pathname === '/robots.txt')
      return finish(await next());
    const central = isCentral(context.url);
    if (hosted && central && !centralAccountPath(context.url.pathname))
      return finish(new Response('Page unavailable.', { status: 404 }));
    if (
      context.url.pathname.startsWith('/api/') &&
      !allowed(
        context.url.host +
          ':' +
          (apiRequestAddress.getStore() ?? context.clientAddress),
      )
    ) {
      headers.set('Retry-After', '60');
      return finish(new Response('Please try again later.', { status: 429 }));
    }
    if (!central) {
      try {
        const fixtures =
          import.meta.env.DEV && config.fixtureMode
            ? await import('@market/storefront-core/fixtures')
            : undefined;
        context.locals.storefront = await resolveStorefront(
          {
            url: context.url,
            authority: context.request.headers.get('host') ?? '',
            fixtureMode: config.fixtureMode,
            production,
          },
          publicStorefrontResolver(
            config.shopApiUrl,
            undefined,
            resolverTransport(),
          ),
          fixtures?.resolveFixture,
        );
      } catch (error) {
        context.locals.storefrontError = safeError(error);
        console.info(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'info',
            event: 'storefront_resolution',
            kind: context.locals.storefrontError.kind,
            requestId,
          }),
        );
        if (hosted && context.url.pathname !== '/') {
          const unavailable =
            context.locals.storefrontError.kind !== 'not-found';
          return finish(
            new Response(
              unavailable ? 'Storefront unavailable.' : 'Page unavailable.',
              {
                status: unavailable ? 503 : 404,
              },
            ),
          );
        }
      }
    }
    if (context.locals.editorPreview) {
      if (
        context.locals.storefront?.storefrontId !==
        context.locals.editorPreview.id
      )
        return finish(new Response('Preview denied.', { status: 403 }));
      context.locals.storefront = {
        ...context.locals.storefront,
        appearance: context.locals.editorPreview.config,
      };
    }
    return finish(await next());
  } catch {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        event: 'storefront_failure',
        requestId,
      }),
    );
    return finish(
      new Response(
        `<!doctype html><html lang="en"><head><title>Temporarily unavailable</title><meta name="robots" content="noindex,nofollow"></head><body><main><h1>Temporarily unavailable</h1><p>Please try again later.</p><p>Reference: ${requestId}</p></main></body></html>`,
        {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        },
      ),
    );
  }
});
