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
import {
  editorOrigin,
  editorPreviewConnectSource,
} from './lib/editor-preview-server';
import { createHash } from 'node:crypto';

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
  const privateRoute =
    /^\/(account|auth|checkout|api|notifications)(\/|$)/.test(
      context.url.pathname,
    );
  if (privateRoute) headers.set('X-Robots-Tag', 'noindex, nofollow');
  async function finish(response: Response) {
    if (
      context.url.pathname.startsWith('/storefront-editor-preview') ||
      context.locals.editorPreview
    ) {
      headers.delete('X-Frame-Options');
      headers.set('X-Robots-Tag', 'noindex, nofollow');
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
