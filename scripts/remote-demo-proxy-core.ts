/**
 * Phase A remote-demo ingress: one loopback-only HTTP entry point for a
 * Cloudflare Quick Tunnel. It validates the public Host, gates every request
 * behind a demo access cookie, strips untrusted forwarding headers and
 * dispatches an explicit route inventory to the existing local servers.
 *
 * Phase B: the application keeps its existing local origins. The proxy maps
 * the one public origin onto them (site selection, Origin/Referer, cookies,
 * Location, CSP and asset URLs), so tenant resolution, account handoffs and
 * backend origin checks run unchanged. See docs/CLOUDFLARE_TUNNEL_PHASE_A.md
 * and docs/CLOUDFLARE_TUNNEL_PHASE_B.md.
 */
import {
  createServer,
  request as httpRequest,
  STATUS_CODES,
  type IncomingHttpHeaders,
  type IncomingMessage,
  type OutgoingHttpHeaders,
  type Server,
  type ServerResponse,
} from 'node:http';
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import type { Duplex } from 'node:stream';
import path from 'node:path';
import { isPrivateIPv4 } from './demo-lan-network';
import { LAN_BROWSER_PATH, LAN_BROWSER_SCRIPT } from './demo-lan-browser';
import {
  REMOTE_DEMO_SITE_PREFIX,
  remoteDemoSiteHost,
  remoteDemoSiteId,
  remoteDemoSiteOf,
  remoteDemoSiteOrigin,
  rewriteRemoteDemoText,
  type RemoteDemoOrigins,
} from '../packages/config/src/remote-demo';

export type UpstreamName = 'storefront' | 'admin' | 'vendure';

/** Base path of the dedicated remote-demo admin Vite instance. */
export const ADMIN_BASE = '/__admin';
/** Proxy-owned routes (access gate). Never forwarded. */
export const CONTROL_PREFIX = '/__remote-demo';
export const ACCESS_COOKIE = '__Host-remote-demo-access';
/** Proxy-owned selection of the Astro site (local authority) this browser is on. */
export const SITE_COOKIE = '__Host-remote-demo-site';
const LAN_SITE_COOKIE = 'demo-lan-site';
/** Cookies an Astro site sets are stored as `rd~<site>~<name>` on the shared public host. */
const PARTITION_MARK = 'rd~';
const LOCAL_PARTITION = 'local';
export const TUNNEL_ORIGIN_FILE = path.join(
  '.remote-demo',
  'tunnel-origin.json',
);
export const QUICK_TUNNEL_ORIGIN =
  /^https:\/\/[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com$/;
export const DEFAULT_PROXY_PORT = 8790;
export const DEFAULT_REMOTE_ADMIN_PORT = 4342;
const MIN_ACCESS_CODE_LENGTH = 20;

export interface RemoteDemoConfig {
  /** Local Wi-Fi ingress only. Remote tunnel configuration never sets this. */
  lanAddress?: string;
  port: number;
  accessCode: string;
  upstreams: Record<UpstreamName, URL>;
  /** Exact public HTTPS origin, or undefined until the tunnel reports one. */
  publicOrigin: () => string | undefined;
  /** Absolute directories each Vite dev server may serve through /@fs/. */
  fsRoots: Record<'storefront' | 'admin', string[]>;
  maxBodyBytes: number;
  sessionSeconds: number;
  log: (line: string) => void;
  /**
   * The local origins the application and backend already use. The proxy
   * presents each request with the internal origin of its virtual host, after
   * validating the public origin, and maps internal URLs back to public ones.
   */
  internal: RemoteDemoOrigins & { defaultSite: string };
}

export type Route =
  | { kind: 'control'; action: 'login' | 'logout' }
  | { kind: 'site'; site: string; next: string }
  | { kind: 'upstream'; upstream: UpstreamName; path: string }
  | { kind: 'deny'; status: number };

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export function parsePort(value: string | undefined, fallback: number) {
  if (value === undefined || value === '') return fallback;
  const port = Number(value);
  if (!/^\d+$/.test(value) || port < 1024 || port > 65535)
    throw new Error('Remote demo ports must be integers from 1024 to 65535.');
  return port;
}

/** Upstreams are local HTTP services only; never a remote or credentialed URL. */
export function parseUpstream(value: string, name: string) {
  const url = new URL(value);
  if (
    url.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    !url.port ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error(
      `${name} must be a loopback http://host:port origin without a path.`,
    );
  return url;
}

/** An exact HTTPS origin without port, path or credentials. */
export function parsePublicOrigin(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.port ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    value.replace(/\/$/, '') !== url.origin
  )
    throw new Error(
      'Remote demo public origin must be an exact https:// origin.',
    );
  return url.origin;
}

export function extractQuickTunnelOrigin(output: string) {
  const match = /https:\/\/[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com/.exec(
    output,
  );
  return match && QUICK_TUNNEL_ORIGIN.test(match[0]) ? match[0] : undefined;
}

/** Reads the origin written by the tunnel launcher; re-read only when it changes. */
export function tunnelOriginReader(file: string) {
  let cachedStamp = '';
  let cached: string | undefined;
  return () => {
    let stamp: string;
    try {
      const stat = statSync(file);
      stamp = `${stat.mtimeMs}:${stat.size}`;
    } catch {
      cachedStamp = '';
      cached = undefined;
      return undefined;
    }
    if (stamp === cachedStamp) return cached;
    cachedStamp = stamp;
    try {
      const origin = (
        JSON.parse(readFileSync(file, 'utf8')) as {
          origin?: unknown;
        }
      ).origin;
      cached =
        typeof origin === 'string' && QUICK_TUNNEL_ORIGIN.test(origin)
          ? origin
          : undefined;
    } catch {
      cached = undefined;
    }
    return cached;
  };
}

/**
 * The existing local account and admin origins (same values the guarded demo
 * scripts require). They are internal identities, never browser URLs.
 */
export function internalOrigins(
  env: Record<string, string | undefined>,
  upstreams: Record<UpstreamName, URL>,
): RemoteDemoConfig['internal'] {
  const storefrontPort = Number(upstreams.storefront.port);
  const admin = env.ADMIN_ORIGIN ?? 'http://localhost:4322';
  if (!/^http:\/\/localhost:\d{2,5}$/.test(admin))
    throw new Error(
      'Remote demo requires a local ADMIN_ORIGIN such as http://localhost:4322.',
    );
  const account =
    env.PLATFORM_ACCOUNT_ORIGIN ?? 'http://auth.platform.localhost:4321';
  const defaultSite = remoteDemoSiteOf(account, storefrontPort);
  if (!defaultSite || defaultSite === 'localhost')
    throw new Error(
      'Remote demo requires a local PLATFORM_ACCOUNT_ORIGIN such as http://auth.platform.localhost:4321 on the storefront port.',
    );
  return {
    admin,
    vendure: `http://localhost:${upstreams.vendure.port}`,
    storefrontPort,
    defaultSite,
  };
}

export function loadRemoteDemoConfig(
  env: Record<string, string | undefined>,
  root: string,
  log: (line: string) => void,
): RemoteDemoConfig {
  const accessCode = env.REMOTE_DEMO_ACCESS_CODE ?? '';
  if (accessCode.length < MIN_ACCESS_CODE_LENGTH || /^(.)\1*$/.test(accessCode))
    throw new Error(
      `Set REMOTE_DEMO_ACCESS_CODE to a random value of at least ${MIN_ACCESS_CODE_LENGTH} characters in the ignored root .env or shell.`,
    );
  const fixed = env.REMOTE_DEMO_PUBLIC_ORIGIN
    ? parsePublicOrigin(env.REMOTE_DEMO_PUBLIC_ORIGIN)
    : undefined;
  const reader = tunnelOriginReader(path.join(root, TUNNEL_ORIGIN_FILE));
  const maxMb = Number(env.REMOTE_DEMO_MAX_BODY_MB ?? 25);
  if (!Number.isInteger(maxMb) || maxMb < 1 || maxMb > 100)
    throw new Error(
      'REMOTE_DEMO_MAX_BODY_MB must be an integer from 1 to 100.',
    );
  const adminPort = parsePort(
    env.REMOTE_DEMO_ADMIN_PORT,
    DEFAULT_REMOTE_ADMIN_PORT,
  );
  const upstreams = {
    storefront: parseUpstream(
      env.REMOTE_DEMO_STOREFRONT_UPSTREAM ?? 'http://127.0.0.1:4321',
      'REMOTE_DEMO_STOREFRONT_UPSTREAM',
    ),
    admin: parseUpstream(
      `http://127.0.0.1:${adminPort}`,
      'REMOTE_DEMO_ADMIN_PORT',
    ),
    vendure: parseUpstream(
      env.REMOTE_DEMO_VENDURE_UPSTREAM ?? 'http://127.0.0.1:3000',
      'REMOTE_DEMO_VENDURE_UPSTREAM',
    ),
  };
  return {
    port: parsePort(env.REMOTE_DEMO_PROXY_PORT, DEFAULT_PROXY_PORT),
    accessCode,
    upstreams,
    publicOrigin: fixed ? () => fixed : reader,
    internal: internalOrigins(env, upstreams),
    fsRoots: {
      storefront: ['node_modules', 'packages', 'apps/storefront'].map((d) =>
        path.join(root, d),
      ),
      admin: ['node_modules', 'packages', 'apps/admin'].map((d) =>
        path.join(root, d),
      ),
    },
    maxBodyBytes: maxMb * 1024 * 1024,
    sessionSeconds: 8 * 60 * 60,
    log,
  };
}

// ---------------------------------------------------------------------------
// Route inventory
// ---------------------------------------------------------------------------

const READ = new Set(['GET', 'HEAD']);
const STOREFRONT_METHODS = new Set([
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
]);
/** Admin SPA roots (apps/admin AdminApp). */
const ADMIN_SPA_PREFIXES = ['/vendor', '/market', '/platform'];
const ADMIN_SPA_EXACT = new Set(['/auth/account']);
/** Astro pages under the admin /vendor prefix (apps/storefront/src/pages/vendor). */
const STOREFRONT_VENDOR_PAGES = new Set([
  '/vendor/application-continue',
  '/vendor/application-help',
  '/vendor/application-return',
]);
/** Vendure routes and tooling that must never be reachable publicly. */
const DENIED_PREFIXES = [
  '/shop-api',
  '/graphiql',
  '/mailbox',
  '/health',
  '/assets/cache',
];
/** Dot segments Vite dev servers legitimately use. Everything else is hidden. */
const ALLOWED_DOT_SEGMENTS = new Set(['.vite', '.astro']);

function within(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function normalizedRoot(directory: string) {
  return `${directory.replace(/\\/g, '/').replace(/\/+$/, '')}/`.toLowerCase();
}

/** `/@fs/E:/repo/node_modules/x.js` must stay inside an approved directory. */
export function fsPathAllowed(fsPath: string, roots: string[]) {
  const candidate = (
    /^\/[A-Za-z]:\//.test(fsPath) ? fsPath.slice(1) : fsPath
  ).toLowerCase();
  return roots.some((root) => candidate.startsWith(normalizedRoot(root)));
}

const deny = (status: number): Route => ({ kind: 'deny', status });
const upstream = (name: UpstreamName, target: string): Route => ({
  kind: 'upstream',
  upstream: name,
  path: target,
});

export function selectRoute(
  method: string,
  target: string,
  fsRoots: RemoteDemoConfig['fsRoots'],
): Route {
  if (!target.startsWith('/') || target.startsWith('//')) return deny(400);
  const queryAt = target.indexOf('?');
  const raw = queryAt < 0 ? target : target.slice(0, queryAt);
  if (/%(2f|5c|00)/i.test(raw) || raw.includes('\\') || raw.includes('//'))
    return deny(400);
  let pathname: string;
  try {
    pathname = decodeURIComponent(raw);
  } catch {
    return deny(400);
  }
  if (/[\0\\%]/.test(pathname)) return deny(400);
  if (
    pathname
      .split('/')
      .some(
        (segment) =>
          segment === '.' ||
          segment === '..' ||
          (segment.startsWith('.') && !ALLOWED_DOT_SEGMENTS.has(segment)),
      )
  )
    return deny(404);

  // `/store/<site>/<rest>` selects a local Astro authority, then continues at `/<rest>`.
  if (within(pathname, REMOTE_DEMO_SITE_PREFIX)) {
    const site = remoteDemoSiteId(
      pathname.slice(REMOTE_DEMO_SITE_PREFIX.length + 1).split('/')[0],
    );
    // The raw target must spell the id literally (no percent-encoded site names).
    if (!site || !raw.startsWith(`${REMOTE_DEMO_SITE_PREFIX}/${site}`))
      return deny(404);
    if (!READ.has(method)) return deny(405);
    const rest = target.slice(REMOTE_DEMO_SITE_PREFIX.length + 1 + site.length);
    return {
      kind: 'site',
      site,
      next: rest.startsWith('/') ? rest : `/${rest}`,
    };
  }

  if (within(pathname, CONTROL_PREFIX)) {
    if (pathname === `${CONTROL_PREFIX}/login`)
      return READ.has(method) || method === 'POST'
        ? { kind: 'control', action: 'login' }
        : deny(405);
    if (pathname === `${CONTROL_PREFIX}/logout`)
      return method === 'POST'
        ? { kind: 'control', action: 'logout' }
        : deny(405);
    return deny(404);
  }

  // Vendure: only the browser Admin GraphQL endpoint and uploaded asset files.
  if (pathname === '/admin-api')
    return method === 'POST' ? upstream('vendure', target) : deny(405);
  if (within(pathname, '/assets/source') || within(pathname, '/assets/preview'))
    return READ.has(method) ? upstream('vendure', target) : deny(405);
  if (DENIED_PREFIXES.some((prefix) => within(pathname, prefix)))
    return deny(404);

  // Admin SPA, served by the dedicated Vite instance under ADMIN_BASE.
  if (within(pathname, ADMIN_BASE)) {
    if (!READ.has(method)) return deny(405);
    if (
      within(pathname, `${ADMIN_BASE}/@fs`) &&
      !fsPathAllowed(pathname.slice(`${ADMIN_BASE}/@fs`.length), fsRoots.admin)
    )
      return deny(404);
    return upstream('admin', target);
  }
  const adminPage =
    !STOREFRONT_VENDOR_PAGES.has(pathname) &&
    (ADMIN_SPA_EXACT.has(pathname) ||
      ADMIN_SPA_PREFIXES.some((prefix) => within(pathname, prefix)));
  if (adminPage || within(pathname, '/rental-stock'))
    return READ.has(method)
      ? upstream('admin', `${ADMIN_BASE}${target}`)
      : deny(405);

  // Everything else is Astro: storefront/account pages, /auth/*, /api/*, /_astro, dev modules.
  if (!STOREFRONT_METHODS.has(method)) return deny(405);
  if (
    within(pathname, '/@fs') &&
    !fsPathAllowed(pathname.slice('/@fs'.length), fsRoots.storefront)
  )
    return deny(404);
  return upstream('storefront', target);
}

// ---------------------------------------------------------------------------
// Header trust boundary
// ---------------------------------------------------------------------------

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-connection',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'http2-settings',
]);
/**
 * Client- or edge-supplied headers that could influence origin, client address
 * or server-to-server trust decisions. They are dropped, never re-derived.
 */
const UNTRUSTED_REQUEST_HEADER =
  /^(forwarded|x-forwarded-.+|x-real-ip|x-client-ip|true-client-ip|x-cluster-client-ip|client-ip|via|cdn-loop|cf-.+|x-original-.+|x-rewrite-url|x-http-method|x-http-method-override|x-method-override|x-account-bridge|x-account-origin|x-storefront-bridge|x-contact-client|x-remote-demo-.+)$/;
const DROPPED_RESPONSE_HEADER = /^(access-control-.+|server|x-powered-by)$/;

function connectionTokens(headers: IncomingHttpHeaders) {
  return (headers.connection ?? '')
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

export function stripAccessCookie(cookie: string) {
  return cookie
    .split(';')
    .map((part) => part.trim())
    .filter(
      (part) =>
        part &&
        !part.startsWith(`${ACCESS_COOKIE}=`) &&
        !part.startsWith(`${SITE_COOKIE}=`) &&
        !part.startsWith(`${LAN_SITE_COOKIE}=`),
    )
    .join('; ');
}

const COOKIE_PREFIX = /^(__Host-|__Secure-)?(.*)$/;

/** `name` set by site `s` -> `rd~s~name` (keeping a `__Host-`/`__Secure-` prefix first). */
export function partitionCookieName(name: string, partition: string) {
  if (partition === LOCAL_PARTITION) return name;
  const [, prefix = '', rest = ''] = COOKIE_PREFIX.exec(name)!;
  return `${prefix}${PARTITION_MARK}${partition}~${rest}`;
}

/**
 * Locally each `*.localhost` site has its own cookie jar, while admin,
 * Vendure and bare `localhost:4321` share host `localhost`. On the one public
 * host the proxy keeps that separation: a site only ever receives its own
 * `rd~<site>~` cookies (unprefixed), and the local partition never receives
 * site cookies. Proxy-owned cookies are always removed.
 */
export function partitionRequestCookies(cookie: string, partition: string) {
  const kept: string[] = [];
  for (const part of stripAccessCookie(cookie).split('; ')) {
    if (!part) continue;
    const at = part.indexOf('=');
    const name = at < 0 ? part : part.slice(0, at);
    const value = at < 0 ? '' : part.slice(at);
    const [, prefix = '', rest = ''] = COOKIE_PREFIX.exec(name)!;
    const partitioned = rest.startsWith(PARTITION_MARK);
    if (partition === LOCAL_PARTITION) {
      if (!partitioned) kept.push(part);
      continue;
    }
    const mark = `${PARTITION_MARK}${partition}~`;
    if (rest.startsWith(mark) && rest.length > mark.length)
      kept.push(`${prefix}${rest.slice(mark.length)}${value}`);
  }
  return kept.join('; ');
}

/** Renames into the partition, forces `Secure` (public HTTPS) and keeps cookies host-only. */
export function rewriteSetCookie(
  value: string,
  partition: string,
  secure = true,
) {
  const [pair = '', ...attributes] = value.split(';');
  const at = pair.indexOf('=');
  const name = (at < 0 ? pair : pair.slice(0, at)).trim();
  const kept = attributes
    .map((attribute) => attribute.trim())
    .filter(
      (attribute) => attribute && !/^(domain|secure)(=|$)/i.test(attribute),
    );
  return [
    `${partitionCookieName(name, partition)}${at < 0 ? '' : pair.slice(at)}`,
    ...kept,
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

/**
 * Per-request virtual host, decided only by the proxy: which local authority
 * the upstream sees, which cookie partition applies, and the internal origin
 * standing in for the already-validated public origin.
 */
export interface VirtualRequest {
  host: string;
  partition: string;
  /** Internal origin replacing an `Origin`/`Referer` equal to the public origin. */
  origin?: string;
  publicOrigin?: string;
}

export function sanitizeRequestHeaders(
  headers: IncomingHttpHeaders,
  target: URL,
  virtual?: VirtualRequest,
): OutgoingHttpHeaders {
  const nominated = connectionTokens(headers);
  const out: OutgoingHttpHeaders = {};
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    const lower = name.toLowerCase();
    if (
      lower === 'host' ||
      HOP_BY_HOP.has(lower) ||
      nominated.includes(lower) ||
      UNTRUSTED_REQUEST_HEADER.test(lower)
    )
      continue;
    if (lower === 'cookie') {
      const joined = Array.isArray(value) ? value.join('; ') : value;
      const kept = virtual
        ? partitionRequestCookies(joined, virtual.partition)
        : stripAccessCookie(joined);
      if (kept) out.cookie = kept;
      continue;
    }
    if (virtual?.origin && virtual.publicOrigin) {
      // Only the exact, proxy-validated public origin is translated; anything
      // else (null, foreign) passes unchanged so application checks reject it.
      if (lower === 'origin') {
        out.origin =
          value === virtual.publicOrigin ? virtual.origin : String(value);
        continue;
      }
      if (lower === 'referer') {
        const text = String(value);
        out.referer = text.startsWith(`${virtual.publicOrigin}/`)
          ? virtual.origin + text.slice(virtual.publicOrigin.length)
          : text;
        continue;
      }
    }
    out[lower] = value;
  }
  // Local dev servers see a local authority, never the tunnel host.
  out.host = virtual?.host ?? target.host;
  return out;
}

/** Context for translating an upstream response back to the public origin. */
export interface ResponseTranslation {
  publicOrigin: string;
  internal: RemoteDemoOrigins;
  partition: string;
  site?: string;
}

/** CSP sources naming internal local origins become the public origin (`ws:` -> `wss:`). */
export function rewriteCsp(value: string, translation: ResponseTranslation) {
  const publicHost = new URL(translation.publicOrigin).host;
  const internal = translation.internal;
  return value.replace(
    /\b(https?|wss?):\/\/((?:[a-z0-9-]+\.)*localhost):(\d+)(?!\d)/g,
    (match, scheme: string, host: string, port: string) => {
      const origin = `http://${host}:${port}`;
      const known =
        origin === internal.admin ||
        origin === internal.vendure ||
        !!remoteDemoSiteOf(origin, internal.storefrontPort);
      if (!known) return match;
      const secure = translation.publicOrigin.startsWith('https:');
      return `${scheme.startsWith('ws') ? (secure ? 'wss' : 'ws') : secure ? 'https' : 'http'}://${publicHost}`;
    },
  );
}

export function sanitizeResponseHeaders(
  headers: IncomingHttpHeaders,
  translation?: ResponseTranslation,
) {
  const nominated = connectionTokens(headers);
  const out: OutgoingHttpHeaders = {};
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    const lower = name.toLowerCase();
    if (
      HOP_BY_HOP.has(lower) ||
      nominated.includes(lower) ||
      DROPPED_RESPONSE_HEADER.test(lower)
    )
      continue;
    if (translation) {
      if (lower === 'set-cookie') {
        out[lower] = (Array.isArray(value) ? value : [String(value)]).map(
          (cookie) =>
            rewriteSetCookie(
              cookie,
              translation.partition,
              translation.publicOrigin.startsWith('https:'),
            ),
        );
        continue;
      }
      if (lower === 'location') {
        out.location = rewriteRemoteDemoText(
          String(value),
          translation.publicOrigin,
          translation.internal,
          translation.site,
          { bareSites: true },
        );
        continue;
      }
      if (
        lower === 'content-security-policy' ||
        lower === 'content-security-policy-report-only'
      ) {
        out[lower] = rewriteCsp(String(value), translation);
        continue;
      }
    }
    out[lower] = value;
  }
  out['x-robots-tag'] = 'noindex, nofollow';
  return out;
}

/** Response bodies whose internal URLs are translated (never scripts or binaries). */
const REWRITABLE =
  /^(text\/html|application\/(?:[\w.-]+\+)?json|application\/xml|text\/xml)\b/i;
const MAX_REWRITE_BYTES = 16 * 1024 * 1024;

/** Vendure: only browser-facing asset URLs, so GraphQL data round-trips unchanged. */
export function rewriteVendureAssets(text: string, from: string, to: string) {
  return text.split(`${from}/assets/`).join(`${to}/assets/`);
}

// ---------------------------------------------------------------------------
// Demo access gate
// ---------------------------------------------------------------------------

function digest(value: string) {
  return createHash('sha256').update(value, 'utf8').digest();
}

export function accessCodeMatches(expected: string, supplied: string) {
  return timingSafeEqual(digest(expected), digest(supplied));
}

function readCookie(header: string | undefined, name: string) {
  for (const part of (header ?? '').split(';')) {
    const at = part.indexOf('=');
    if (at > 0 && part.slice(0, at).trim() === name)
      return part.slice(at + 1).trim();
  }
  return undefined;
}

export function createAccessTokens(sessionSeconds: number) {
  // Per-process key: restarting the proxy revokes every demo session.
  const key = randomBytes(32);
  const sign = (origin: string, expires: number) =>
    createHmac('sha256', key).update(`${origin}\n${expires}`).digest();
  return {
    issue(origin: string, now = Date.now()) {
      const expires = Math.floor(now / 1000) + sessionSeconds;
      return `${expires}.${sign(origin, expires).toString('base64url')}`;
    },
    verify(token: string | undefined, origin: string, now = Date.now()) {
      if (!token) return false;
      const [expiresText, signature, extra] = token.split('.');
      if (extra !== undefined || !expiresText || !signature) return false;
      if (!/^\d{1,12}$/.test(expiresText)) return false;
      const expires = Number(expiresText);
      if (expires <= Math.floor(now / 1000)) return false;
      const supplied = Buffer.from(signature, 'base64url');
      const expected = sign(origin, expires);
      return (
        supplied.length === expected.length &&
        timingSafeEqual(supplied, expected)
      );
    },
  };
}

/** Global failure budget; every tunnel request arrives from loopback cloudflared. */
export function createLoginLimiter(maxFailures = 10, windowMs = 10 * 60_000) {
  let failures: number[] = [];
  return {
    blocked(now = Date.now()) {
      failures = failures.filter((at) => now - at < windowMs);
      return failures.length >= maxFailures;
    },
    fail(now = Date.now()) {
      failures.push(now);
    },
  };
}

function safeNext(value: string | null) {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    within(value.split('?')[0] ?? '', CONTROL_PREFIX)
  )
    return '/';
  return value;
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  );

/**
 * Self-contained gate page. It cannot reuse the app's shared components: the
 * gate must render before any application asset is reachable.
 */
function loginPage(next: string, message?: string) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Remote demo access</title>
<style>body{font:16px system-ui,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f5f1;color:#1d1d1b}
form{background:#fff;padding:24px;border-radius:12px;box-shadow:0 1px 4px #0002;width:min(360px,calc(100vw - 32px));box-sizing:border-box;display:grid;gap:12px}
h1{font-size:20px;margin:0}input,button{font:inherit;padding:10px;border-radius:8px;border:1px solid #bbb}
button{background:#2f5d3a;color:#fff;border:0;cursor:pointer}p{margin:0;color:#a12a1e}</style></head>
<body><form method="post" action="${CONTROL_PREFIX}/login"><h1>Remote demo access</h1>
${message ? `<p role="alert">${escapeHtml(message)}</p>` : ''}
<label for="code">Access code</label><input id="code" name="code" type="password" autocomplete="current-password" required autofocus>
<input type="hidden" name="next" value="${escapeHtml(next)}"><button type="submit">Continue</button></form></body></html>`;
}

const GATE_HEADERS = {
  'cache-control': 'no-store',
  'x-robots-tag': 'noindex, nofollow',
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  // Not no-referrer: browsers then send `Origin: null` on the login form POST,
  // which the exact same-origin check rejects. same-origin still sends no referrer cross-site.
  'referrer-policy': 'same-origin',
  'content-security-policy':
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
};

function plain(response: ServerResponse, status: number, body?: string) {
  if (response.headersSent) {
    response.destroy();
    return;
  }
  response.writeHead(status, {
    ...GATE_HEADERS,
    'content-type': 'text/plain; charset=utf-8',
  });
  response.end(body ?? STATUS_CODES[status] ?? '');
}

function readSmallBody(request: IncomingMessage, limit: number) {
  return new Promise<string>((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('too large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

function requestPathname(target: string) {
  return target.split('?')[0] ?? '/';
}

export function createRemoteDemoProxy(config: RemoteDemoConfig): Server {
  if (
    config.lanAddress &&
    (!isPrivateIPv4(config.lanAddress) ||
      config.publicOrigin() !== `http://${config.lanAddress}:${config.port}`)
  )
    throw new Error('LAN demo requires an exact private IPv4 HTTP origin.');
  const siteCookie = config.lanAddress ? LAN_SITE_COOKIE : SITE_COOKIE;
  const secureCookie = config.lanAddress ? '' : '; Secure';
  const tokens = createAccessTokens(config.sessionSeconds);
  const limiter = createLoginLimiter();
  // Never log query strings, headers or bodies: they can carry handoff codes or the access code.
  const record = (method: string, target: string, status: number, to = '-') =>
    config.log(`${method} ${requestPathname(target)} -> ${to} ${status}`);

  function authorized(request: IncomingMessage, origin: string) {
    if (config.lanAddress) return true;
    return tokens.verify(
      readCookie(request.headers.cookie, ACCESS_COOKIE),
      origin,
    );
  }

  function sameOrigin(request: IncomingMessage, origin: string) {
    return request.headers.origin === origin;
  }

  async function control(
    action: 'login' | 'logout',
    request: IncomingMessage,
    response: ServerResponse,
    origin: string,
  ) {
    const method = request.method ?? '';
    if (action === 'logout') {
      if (!sameOrigin(request, origin)) return plain(response, 403);
      response.writeHead(303, {
        ...GATE_HEADERS,
        location: `${CONTROL_PREFIX}/login`,
        'set-cookie': `${ACCESS_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
      });
      return response.end();
    }
    const html = (status: number, next: string, message?: string) => {
      response.writeHead(status, {
        ...GATE_HEADERS,
        'content-type': 'text/html; charset=utf-8',
      });
      response.end(method === 'HEAD' ? undefined : loginPage(next, message));
    };
    if (READ.has(method)) {
      const next = safeNext(
        new URL(request.url ?? '/', origin).searchParams.get('next'),
      );
      return html(200, next);
    }
    if (!sameOrigin(request, origin)) return plain(response, 403);
    if (
      !(request.headers['content-type'] ?? '').startsWith(
        'application/x-www-form-urlencoded',
      )
    )
      return plain(response, 415);
    if (limiter.blocked())
      return plain(response, 429, 'Too many attempts. Try again later.');
    let form: URLSearchParams;
    try {
      form = new URLSearchParams(await readSmallBody(request, 4096));
    } catch {
      return plain(response, 413);
    }
    const next = safeNext(form.get('next'));
    if (!accessCodeMatches(config.accessCode, form.get('code') ?? '')) {
      limiter.fail();
      config.log('remote demo access denied');
      return html(401, next, 'That access code was not accepted.');
    }
    response.writeHead(303, {
      ...GATE_HEADERS,
      location: next,
      'set-cookie': `${ACCESS_COOKIE}=${tokens.issue(origin)}; Path=/; Max-Age=${config.sessionSeconds}; HttpOnly; Secure; SameSite=Lax`,
    });
    response.end();
  }

  /** The Astro site this browser is on: the proxy's own cookie, else the central account. */
  function currentSite(request: IncomingMessage) {
    return (
      remoteDemoSiteId(readCookie(request.headers.cookie, siteCookie)) ??
      config.internal.defaultSite
    );
  }

  /**
   * The internal origin of the document that issued a same-origin request,
   * from its public path: admin SPA pages are the admin origin, every other
   * page belongs to the current site. Without a Referer the request's own
   * virtual host is used. This mirrors the local origins; it is routing, not
   * an authorization boundary (all virtual hosts share one browser origin).
   */
  function initiatorOrigin(
    request: IncomingMessage,
    publicOrigin: string,
    name: UpstreamName,
    site: string,
  ) {
    const siteOrigin = remoteDemoSiteOrigin(
      site,
      config.internal.storefrontPort,
    );
    const referer = request.headers.referer;
    if (referer?.startsWith(`${publicOrigin}/`)) {
      const from = selectRoute(
        'GET',
        referer.slice(publicOrigin.length),
        config.fsRoots,
      );
      return from.kind === 'upstream' && from.upstream === 'admin'
        ? config.internal.admin
        : siteOrigin;
    }
    return name === 'storefront' ? siteOrigin : config.internal.admin;
  }

  function virtualFor(
    request: IncomingMessage,
    name: UpstreamName,
    publicOrigin: string,
  ): { virtual: VirtualRequest; translation: ResponseTranslation } {
    const site = currentSite(request);
    const destination = config.upstreams[name];
    const partition =
      name === 'storefront' && site !== 'localhost' ? site : LOCAL_PARTITION;
    return {
      virtual: {
        host:
          name === 'storefront'
            ? remoteDemoSiteHost(site, config.internal.storefrontPort)
            : name === 'vendure'
              ? // Vendure derives asset URLs from Host; keep its local `localhost` form.
                `localhost:${destination.port}`
              : destination.host,
        partition,
        origin: initiatorOrigin(request, publicOrigin, name, site),
        publicOrigin,
      },
      translation: {
        publicOrigin,
        internal: config.internal,
        partition,
        site: name === 'storefront' ? site : undefined,
      },
    };
  }

  function forward(
    request: IncomingMessage,
    response: ServerResponse,
    name: UpstreamName,
    target: string,
    publicOrigin: string,
  ) {
    const method = request.method ?? 'GET';
    const declared = Number(request.headers['content-length'] ?? 0);
    if (!Number.isFinite(declared) || declared > config.maxBodyBytes) {
      record(method, target, 413);
      return plain(response, 413);
    }
    const destination = config.upstreams[name];
    const { virtual, translation } = virtualFor(request, name, publicOrigin);
    const headers = sanitizeRequestHeaders(
      request.headers,
      destination,
      virtual,
    );
    // Bodies may be translated; ask the local servers not to compress them.
    if (name !== 'admin' || config.lanAddress)
      headers['accept-encoding'] = 'identity';
    const vendureOrigin = config.internal.vendure;
    let finished = false;
    const fail = (status: number, body?: string) => {
      if (finished) return response.destroy();
      finished = true;
      record(method, target, status, name);
      plain(response, status, body);
    };
    const outbound = httpRequest(
      {
        host: destination.hostname.replace(/^\[|\]$/g, ''),
        port: destination.port,
        method,
        path: target,
        headers,
        timeout: 120_000,
      },
      (upstreamResponse) => {
        const status = upstreamResponse.statusCode ?? 502;
        const out = sanitizeResponseHeaders(
          upstreamResponse.headers,
          translation,
        );
        const type = String(upstreamResponse.headers['content-type'] ?? '');
        const encoding = String(
          upstreamResponse.headers['content-encoding'] ?? 'identity',
        );
        const length = Number(upstreamResponse.headers['content-length'] ?? 0);
        if (
          (name === 'admin' && !config.lanAddress) ||
          method === 'HEAD' ||
          status === 204 ||
          status === 304 ||
          !REWRITABLE.test(type) ||
          encoding !== 'identity' ||
          length > MAX_REWRITE_BYTES
        ) {
          finished = true;
          response.writeHead(status, out);
          upstreamResponse.pipe(response);
          record(method, target, status, name);
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        upstreamResponse.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_REWRITE_BYTES) {
            upstreamResponse.destroy();
            fail(502, 'Upstream response too large');
          } else chunks.push(chunk);
        });
        upstreamResponse.on('error', () => fail(502));
        upstreamResponse.on('end', () => {
          if (finished) return;
          finished = true;
          let text = Buffer.concat(chunks).toString('utf8');
          if (config.lanAddress && /^text\/html\b/i.test(type)) {
            text = text.replace(
              /<head\b[^>]*>/i,
              (head) => `${head}<script src="${LAN_BROWSER_PATH}"></script>`,
            );
          }
          const body = Buffer.from(
            name === 'vendure'
              ? rewriteVendureAssets(text, vendureOrigin, publicOrigin)
              : rewriteRemoteDemoText(
                  text,
                  publicOrigin,
                  config.internal,
                  translation.site,
                ),
            'utf8',
          );
          delete out['transfer-encoding'];
          out['content-length'] = body.length;
          response.writeHead(status, out);
          response.end(body);
          record(method, target, status, name);
        });
      },
    );
    outbound.on('timeout', () => outbound.destroy(new Error('timeout')));
    outbound.on('error', () => fail(502, 'Upstream unavailable'));
    // The iframe posts its draft as form-encoded JSON to Astro, which calls
    // authorizeStorefrontPreview directly. It never crosses /admin-api here.
    const previewForm =
      name === 'storefront' &&
      target.split('?')[0] === '/storefront-editor-preview/render' &&
      /^application\/x-www-form-urlencoded\b/i.test(
        request.headers['content-type'] ?? '',
      );
    // Public asset URLs must reach both validation and saves in local form.
    if (
      method === 'POST' &&
      (previewForm ||
        (name === 'vendure' &&
          /^application\/json\b/i.test(request.headers['content-type'] ?? '')))
    ) {
      readSmallBody(request, config.maxBodyBytes)
        .then((text) => {
          if (previewForm) {
            const form = new URLSearchParams(text);
            const payload = form.get('payload');
            if (payload !== null)
              form.set(
                'payload',
                rewriteVendureAssets(payload, publicOrigin, vendureOrigin),
              );
            text = form.toString();
          } else {
            text = rewriteVendureAssets(text, publicOrigin, vendureOrigin);
          }
          const body = Buffer.from(text, 'utf8');
          outbound.setHeader('content-length', body.length);
          outbound.end(body);
        })
        .catch(() => {
          outbound.destroy();
          fail(413);
        });
      return;
    }
    let received = 0;
    request.on('data', (chunk: Buffer) => {
      received += chunk.length;
      if (received <= config.maxBodyBytes) return;
      request.unpipe(outbound);
      outbound.destroy();
      fail(413);
    });
    request.pipe(outbound);
  }

  const server = createServer((request, response) => {
    const method = request.method ?? '';
    const target = request.url ?? '/';
    const origin = config.publicOrigin();
    if (!origin) {
      record(method, target, 503);
      return plain(
        response,
        503,
        'Remote demo tunnel origin is not configured yet.',
      );
    }
    if ((request.headers.host ?? '').toLowerCase() !== new URL(origin).host) {
      record(method, target, 421);
      return plain(response, 421);
    }
    if (
      config.lanAddress &&
      target === '/' &&
      currentSite(request) === config.internal.defaultSite
    ) {
      response.writeHead(302, {
        location: '/store/localhost/',
        'cache-control': 'no-store',
      });
      return response.end();
    }
    if (config.lanAddress && target === LAN_BROWSER_PATH && READ.has(method)) {
      response.writeHead(200, {
        'content-type': 'application/javascript',
        'cache-control': 'no-store',
      });
      return response.end(method === 'HEAD' ? undefined : LAN_BROWSER_SCRIPT);
    }
    const route = selectRoute(method, target, config.fsRoots);
    if (route.kind === 'control') {
      if (config.lanAddress) return plain(response, 404);
      control(route.action, request, response, origin).catch(() =>
        plain(response, 500),
      );
      return;
    }
    if (!authorized(request, origin)) {
      record(method, target, 401);
      if (
        READ.has(method) &&
        (request.headers.accept ?? '').includes('text/html')
      ) {
        response.writeHead(303, {
          ...GATE_HEADERS,
          location: `${CONTROL_PREFIX}/login?next=${encodeURIComponent(requestPathname(target))}`,
        });
        return response.end();
      }
      return plain(response, 401, 'Remote demo access required.');
    }
    if (route.kind === 'deny') {
      record(method, target, route.status);
      return plain(response, route.status);
    }
    if (route.kind === 'site') {
      record(method, target, 303);
      // No frame restriction here: the storefront editor preview iframe enters this way.
      response.writeHead(303, {
        'cache-control': 'no-store',
        'x-robots-tag': 'noindex, nofollow',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'same-origin',
        location: route.next,
        // Session cookie, proxy-owned and never forwarded upstream.
        'set-cookie': `${siteCookie}=${route.site}; Path=/; HttpOnly${secureCookie}; SameSite=Lax`,
      });
      return response.end();
    }
    if (!READ.has(method) && !sameOrigin(request, origin)) {
      record(method, target, 403);
      return plain(response, 403, 'Cross-origin request rejected.');
    }
    forward(request, response, route.upstream, route.path, origin);
  });

  server.on(
    'upgrade',
    (request: IncomingMessage, socket: Duplex, head: Buffer) => {
      const target = request.url ?? '/';
      const refuse = (status: number) => {
        record('UPGRADE', target, status);
        socket.end(
          `HTTP/1.1 ${status} ${STATUS_CODES[status] ?? ''}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
        );
      };
      socket.on('error', () => socket.destroy());
      const origin = config.publicOrigin();
      if (!origin) return refuse(503);
      if ((request.headers.host ?? '').toLowerCase() !== new URL(origin).host)
        return refuse(421);
      if (!authorized(request, origin)) return refuse(401);
      if (!sameOrigin(request, origin)) return refuse(403);
      // Only Vite HMR sockets exist; the application itself has no WebSocket endpoint.
      const protocols = String(request.headers['sec-websocket-protocol'] ?? '')
        .split(',')
        .map((value) => value.trim());
      if (
        request.method !== 'GET' ||
        String(request.headers.upgrade ?? '').toLowerCase() !== 'websocket' ||
        !protocols.some(
          (value) => value === 'vite-hmr' || value === 'vite-ping',
        )
      )
        return refuse(400);
      const pathname = requestPathname(target);
      const name: UpstreamName | undefined =
        pathname === '/'
          ? 'storefront'
          : pathname === `${ADMIN_BASE}/`
            ? 'admin'
            : undefined;
      if (!name) return refuse(404);
      const destination = config.upstreams[name];
      const headers = sanitizeRequestHeaders(request.headers, destination);
      headers.connection = 'Upgrade';
      headers.upgrade = 'websocket';
      const outbound = httpRequest({
        host: destination.hostname.replace(/^\[|\]$/g, ''),
        port: destination.port,
        method: 'GET',
        path: target,
        headers,
      });
      outbound.on(
        'upgrade',
        (upstreamResponse, upstreamSocket, upstreamHead) => {
          const lines = ['HTTP/1.1 101 Switching Protocols'];
          for (let i = 0; i < upstreamResponse.rawHeaders.length; i += 2)
            lines.push(
              `${upstreamResponse.rawHeaders[i]}: ${upstreamResponse.rawHeaders[i + 1]}`,
            );
          socket.write(`${lines.join('\r\n')}\r\n\r\n`);
          if (upstreamHead.length) socket.write(upstreamHead);
          if (head.length) upstreamSocket.write(head);
          upstreamSocket.on('error', () => socket.destroy());
          socket.on('close', () => upstreamSocket.destroy());
          upstreamSocket.on('close', () => socket.destroy());
          upstreamSocket.pipe(socket).pipe(upstreamSocket);
          record('UPGRADE', target, 101, name);
        },
      );
      outbound.on('response', (upstreamResponse) => {
        upstreamResponse.resume();
        refuse(upstreamResponse.statusCode ?? 502);
      });
      outbound.on('error', () => refuse(502));
      outbound.end();
    },
  );

  server.headersTimeout = 15_000;
  server.requestTimeout = 180_000;
  server.keepAliveTimeout = 5_000;
  return server;
}

/** Tunnel ingress stays loopback-only; LAN ingress binds its exact private address. */
export async function startRemoteDemoProxy(config: RemoteDemoConfig) {
  const server = createRemoteDemoProxy(config);
  const host = config.lanAddress ?? '127.0.0.1';
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, host, () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string' || address.address !== host) {
    server.close();
    throw new Error(`Demo proxy must bind to ${host} only.`);
  }
  return server;
}
