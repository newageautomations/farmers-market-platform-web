export function normalizeOrigin(value: string): string {
  if (!value || /[%\\\s]/.test(value)) throw new Error('Invalid origin');
  const url = new URL(value);
  if (
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
  const mode = input.APP_ENV ?? (input.NODE_ENV === 'test' ? 'test' : 'dev');
  if (!['dev', 'test', 'production'].includes(mode))
    throw new Error('APP_ENV explicit mode required');
  return mode;
}
export function requireStrongSecret(value: string | undefined, name: string) {
  if (
    !value ||
    value.length < 32 ||
    value.length > 4096 ||
    new Set(value).size < 12 ||
    /example|change.?me|placeholder|default|test.?only|disposable|password/i.test(
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
