import { defineMiddleware } from 'astro:middleware';
import {
  resolveStorefront,
  publicStorefrontResolver,
} from '@market/storefront-core';
import { safeError } from '@market/api';
import {
  validateEnvironment,
  runtimeMode,
  responseSecurityHeaders,
  cspDirectives,
} from '@market/config';
import { isCentral } from './lib/account';

// The built SSR module also fails closed when started without the convenience wrapper.
declare const __PRODUCTION_BUILD__: boolean;
declare const __PRODUCTION_CSP_ORIGINS__: { account: string; asset: string };
if (runtimeMode(process.env) === 'production') {
  if (!__PRODUCTION_BUILD__)
    throw new Error('Production runtime requires an explicit production build');
  validateEnvironment(process.env, 'production');
  if (
    process.env.PLATFORM_ACCOUNT_ORIGIN !==
      __PRODUCTION_CSP_ORIGINS__.account ||
    (process.env.ASSET_URL_PREFIX
      ? new URL(process.env.ASSET_URL_PREFIX).origin
      : '') !== __PRODUCTION_CSP_ORIGINS__.asset
  )
    throw new Error('Production CSP origins require a matching build');
}

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
export const onRequest = defineMiddleware(async (context, next) => {
  const requestId = crypto.randomUUID();
  const production = runtimeMode(process.env) === 'production';
  const headers = new Headers(responseSecurityHeaders(production));
  headers.set('X-Request-Id', requestId);
  const privateRoute = /^\/(account|auth|checkout|api)(\/|$)/.test(
    context.url.pathname,
  );
  if (privateRoute) headers.set('X-Robots-Tag', 'noindex, nofollow');
  function finish(response: Response) {
    for (const [key, value] of headers) response.headers.set(key, value);
    if (response.status >= 400)
      response.headers.set('X-Robots-Tag', 'noindex, nofollow');
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
    const config = validateEnvironment(
      {
        ...process.env,
        APP_ENV: process.env.APP_ENV ?? 'dev',
        SHOP_API_URL: process.env.SHOP_API_URL ?? import.meta.env.SHOP_API_URL,
        PUBLIC_ADMIN_API_URL:
          process.env.PUBLIC_ADMIN_API_URL ??
          import.meta.env.PUBLIC_ADMIN_API_URL,
        FRONTEND_FIXTURE_MODE:
          process.env.FRONTEND_FIXTURE_MODE ??
          import.meta.env.FRONTEND_FIXTURE_MODE,
      },
      import.meta.env.DEV ? 'development' : 'production',
    );
    context.locals.shopApiUrl = config.shopApiUrl;
    // Astro allowedDomains is empty. Security decisions never consume forwarded headers.
    if (production && context.url.protocol !== 'https:')
      return finish(new Response('HTTPS is required.', { status: 400 }));
    if (
      context.request.method !== 'GET' &&
      context.request.method !== 'HEAD' &&
      context.request.headers.get('origin') !== context.url.origin
    )
      return finish(new Response('Request denied.', { status: 403 }));
    if (
      context.url.pathname.startsWith('/api/') &&
      !allowed(context.url.host + ':' + context.clientAddress)
    ) {
      headers.set('Retry-After', '60');
      return finish(new Response('Please try again later.', { status: 429 }));
    }
    if (!isCentral(context.url)) {
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
          publicStorefrontResolver(config.shopApiUrl),
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
      }
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
