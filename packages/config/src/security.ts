import { deploymentEnvironment } from './deployment-environment.ts';
import type { DeploymentEnvironment } from './deployment-environment.ts';

export function normalizeOrigin(value: string): string {
  if (!value || /[%\\\s]/.test(value)) throw new Error('Invalid origin');
  const url = URL.parse(value);
  if (
    !url ||
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error('Invalid origin');
  return url.origin;
}
export function runtimeMode(input: Record<string, string | undefined>) {
  return deploymentEnvironment(
    input,
    input.NODE_ENV === 'test' ? 'test' : 'dev',
  ).mode;
}

export const noIndexHeader = 'noindex, nofollow';
export const noIndexMeta = 'noindex,nofollow';
export const restrictiveRobots = 'User-agent: *\nDisallow: /\n';

export function blocksIndexing(deployment?: DeploymentEnvironment) {
  return deployment === 'staging';
}

export function storefrontRobotsMeta(
  deployment: DeploymentEnvironment | undefined,
  privatePage: boolean,
  tenantDirective?: string,
) {
  return blocksIndexing(deployment) || privatePage
    ? noIndexMeta
    : (tenantDirective ?? noIndexMeta);
}
export function requireStrongSecret(value: string | undefined, name: string) {
  if (
    !value ||
    value.length < 32 ||
    value.length > 4096 ||
    new Set(value).size < 12 ||
    /example|change.?me|placeholder|default|test.?only|disposable|password|secret.?here/i.test(
      value,
    )
  )
    throw new Error(`${name} requires a strong secret`);
}
/** Extension requires exact HTTPS origins and review at the call site. No provider origins are preconfigured. */
export function cspDirectives(
  options: {
    adminApiOrigin?: string;
    accountOrigin?: string;
    assetOrigin?: string;
  } = {},
) {
  const reviewed = (value?: string) => {
    if (!value) return '';
    const origin = normalizeOrigin(value);
    if (!origin.startsWith('https://'))
      throw new Error('CSP extensions require HTTPS');
    return ` ${origin}`;
  };
  return [
    "default-src 'self'",
    `connect-src 'self'${reviewed(options.adminApiOrigin)}`,
    `img-src 'self' data:${reviewed(options.assetOrigin)}`,
    "font-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    `form-action 'self'${reviewed(options.accountOrigin)}`,
    "frame-ancestors 'none'",
  ] as const;
}
export function responseSecurityHeaders(production: boolean) {
  return {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    // Suppress paths/tokens while retaining Origin on top-level POST navigation.
    // no-referrer makes browser form Origin opaque (null), breaking exact-origin CSRF.
    'Referrer-Policy': 'strict-origin',
    'Permissions-Policy':
      'camera=(), microphone=(), geolocation=(), payment=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'X-Frame-Options': 'DENY',
    ...(production ? { 'Strict-Transport-Security': 'max-age=31536000' } : {}),
  };
}

/** Admin must load a new document when entering or leaving a preview-capable editor. */
export function storefrontEditorDocument(path: string) {
  const pathname = documentPath(path);
  return pathname === '/vendor/storefront' || pathname === '/market/storefront';
}

export function storefrontPreviewDocument(path: string) {
  const pathname = documentPath(path);
  return (
    pathname === '/storefront-editor-preview' ||
    pathname === '/storefront-editor-preview/render'
  );
}

/** These Admin entry points share the booth invoice payment composition. */
export function stripeInvoiceDocument(path: string) {
  const pathname = documentPath(path);
  return (
    pathname === '/vendor/booths' ||
    pathname === '/vendor/markets' ||
    pathname === '/vendor/applications' ||
    pathname === '/markets'
  );
}

/** Stripe.js hosted card entry and 3D Secure for the existing Elements forms. */
export function stripeElementsCsp(policy: string) {
  return policy
    .split(';')
    .map((directive) => {
      const name = directive.trim().split(/\s+/, 1)[0];
      if (name === 'script-src') return `${directive} https://js.stripe.com`;
      if (name === 'connect-src') return `${directive} https://api.stripe.com`;
      if (name === 'frame-src')
        return ' frame-src https://js.stripe.com https://hooks.stripe.com';
      return directive;
    })
    .join(';');
}

function documentPath(path: string) {
  return path.split(/[?#]/, 1)[0]?.replace(/\/$/, '');
}
/** Stream bounded before parsing, including chunked and multi-byte input. */
export async function boundedBody(
  request: Request,
  limit = 4096,
): Promise<string> {
  if (Number(request.headers.get('content-length') ?? 0) > limit)
    throw new Error('Request too large');
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error('Request too large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(result);
}
export function temporaryUnavailableResponse() {
  return new Response(
    '<!doctype html><html lang="en"><head><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Service unavailable</title></head><body><main><h1>Temporarily unavailable</h1><p role="alert">Service unavailable. Please try again later.</p></main></body></html>',
    {
      status: 503,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store',
      },
    },
  );
}
