import { boundedBody, normalizeOrigin } from '@market/config';
import {
  storefrontAppearanceSchema,
  storefrontPreviewPath,
} from '@market/theme/storefront';
import type { APIContext } from 'astro';

export function editorOrigin() {
  return normalizeOrigin(process.env.ADMIN_ORIGIN ?? 'http://localhost:4322');
}
/** Only Vite's exact local socket is allowed, never HTTP commerce connections. */
export function editorPreviewConnectSource(url: URL, development: boolean) {
  const local =
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.hostname.endsWith('.localhost');
  return development && local
    ? `connect-src ${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`
    : "connect-src 'none'";
}
export async function authorizeEditorRender(context: APIContext) {
  // Bounded 80k-character configurations can expand under Unicode form encoding.
  const body = await boundedBody(context.request, 1500000);
  const payload = JSON.parse(
    new URLSearchParams(body).get('payload') ?? 'null',
  );
  if (
    !payload ||
    typeof payload !== 'object' ||
    !storefrontPreviewPath(payload.path) ||
    typeof payload.token !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(payload.token) ||
    !Number.isFinite(payload.scroll) ||
    payload.scroll < 0 ||
    payload.scroll > 1000000
  )
    throw new Error('Invalid preview');
  const config = storefrontAppearanceSchema.parse(payload.config);
  const storefront = context.locals.storefront;
  if (storefront?.kind !== 'VENDOR' || storefront.source !== 'backend')
    throw new Error('Invalid storefront');
  const endpoint =
    process.env.PUBLIC_ADMIN_API_URL ?? import.meta.env.PUBLIC_ADMIN_API_URL;
  const response = await fetch(endpoint, {
    method: 'POST',
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query:
        'query AuthorizePreview($token: String!, $host: String!, $config: JSON!) { authorizeStorefrontPreview(token: $token, host: $host, config: $config) }',
      variables: { token: payload.token, host: context.url.host, config },
    }),
  });
  const result = await response.json();
  if (
    !response.ok ||
    result.errors ||
    result.data?.authorizeStorefrontPreview?.id !== storefront.storefrontId
  )
    throw new Error('Preview denied');
  return {
    config,
    path: payload.path,
    scroll: payload.scroll as number,
    id: storefront.storefrontId!,
  };
}
