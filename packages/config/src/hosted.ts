import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { isIP, SocketAddress } from 'node:net';
import { isLoopbackHost } from './deployment-environment.ts';
import type { DeploymentEnvironment } from './deployment-environment.ts';
import { requireStrongSecret } from './security.ts';

type Environment = Record<string, string | undefined>;
const dnsLabel = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const reserved = new Set([
  'admin',
  'auth',
  'api',
  'assets',
  'www',
  'healthcheck',
  'ingress',
  'gateway',
]);

export function publicPlatformDomain(host: string) {
  return (
    host.length <= 253 &&
    host.split('.').length >= 2 &&
    host.split('.').every((label) => dnsLabel.test(label)) &&
    /\.[a-z]{2,63}$/.test(host) &&
    !/\.(?:localhost|localdomain|local|internal|railway\.app|up\.railway\.app|pages\.dev|workers\.dev|trycloudflare\.com|railway\.internal)$/.test(
      '.' + host,
    )
  );
}

export function hostedTenantHost(host: string, parent: string) {
  const suffix = '.' + parent;
  const label = host.slice(0, -suffix.length);
  return (
    host.length <= 253 &&
    host.endsWith(suffix) &&
    dnsLabel.test(label) &&
    !label.startsWith('xn--') &&
    !reserved.has(label)
  );
}

export function privateApiOrigin(value: string | undefined) {
  const url = value && URL.parse(value);
  if (
    !url ||
    url.origin !== value ||
    url.protocol !== 'http:' ||
    !url.port ||
    Number(url.port) === 0 ||
    !url.hostname.endsWith('.railway.internal') ||
    !dnsLabel.test(url.hostname.slice(0, -'.railway.internal'.length))
  )
    throw new Error(
      'INTERNAL_API_ORIGIN requires a Railway private HTTP origin with a port',
    );
  return url.origin;
}

export function hostedKey(value: string | undefined, name: string) {
  requireStrongSecret(value, name);
  if (!/^[a-f0-9]{64}$/.test(value!))
    throw new Error(
      name + ' requires 32 random bytes encoded as lowercase hex',
    );
  return value!;
}

export function storefrontPrivateApi(env: Environment) {
  if (env.HOSTED_TRANSPORT !== 'railway-private') {
    if (
      env.INTERNAL_API_ORIGIN !== undefined ||
      env.MARKET_SSR_API_KEY !== undefined
    )
      throw new Error('Private API settings require the hosted transport');
    return;
  }
  const origin = privateApiOrigin(env.INTERNAL_API_ORIGIN);
  const key = hostedKey(env.MARKET_SSR_API_KEY, 'MARKET_SSR_API_KEY');
  if (key === env.PLATFORM_ACCOUNT_BRIDGE_KEY || key === env.MARKET_INGRESS_KEY)
    throw new Error('SSR transport requires a separate credential');
  return { origin, key };
}

export function frontendListener(
  env: Environment,
  deployment: DeploymentEnvironment,
  service: 'admin' | 'storefront',
) {
  const hosted = env.HOSTED_TRANSPORT === 'railway-private';
  const address = env.HOST ?? (hosted ? '::' : '127.0.0.1');
  const configuredPort =
    env.PORT ?? (service === 'admin' ? env.ADMIN_PORT : undefined);
  const port = Number(configuredPort ?? (service === 'admin' ? 4341 : 4321));
  if (
    (!isIP(address) && address !== 'localhost') ||
    (configuredPort !== undefined && !/^\d+$/.test(configuredPort)) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  )
    throw new Error('Invalid frontend listener address or port');
  if (env.HOSTED_TRANSPORT !== undefined && !hosted)
    throw new Error('Unsupported HOSTED_TRANSPORT');
  if (hosted) {
    if (
      !['staging', 'production'].includes(deployment) ||
      env.SERVER_KEY_PATH !== undefined ||
      env.SERVER_CERT_PATH !== undefined ||
      (env.TRUSTED_PROXY_CIDRS !== undefined &&
        env.TRUSTED_PROXY_CIDRS !== 'disabled') ||
      !env.PORT ||
      !isIP(address) ||
      (service === 'admin' && env.ADMIN_PORT !== undefined)
    )
      throw new Error('Contradictory hosted frontend listener settings');
    const ingressKey = hostedKey(env.MARKET_INGRESS_KEY, 'MARKET_INGRESS_KEY');
    if (
      ingressKey === env.PLATFORM_ACCOUNT_BRIDGE_KEY ||
      ingressKey === env.MARKET_SSR_API_KEY
    )
      throw new Error('Ingress and API credentials must be separate');
    return { address, port, ingressKey };
  }
  if (
    deployment === 'staging' ||
    env.MARKET_INGRESS_KEY !== undefined ||
    (deployment === 'local-qualification' && !isLoopbackHost(address))
  )
    throw new Error('Invalid native frontend listener configuration');
  if (!env.SERVER_KEY_PATH || !env.SERVER_CERT_PATH)
    throw new Error('HTTPS certificate paths required');
  return {
    address,
    port,
    keyPath: env.SERVER_KEY_PATH,
    certPath: env.SERVER_CERT_PATH,
  };
}

export function hostedFrontend(
  env: Environment,
  publicOrigins: readonly string[],
) {
  const parent = env.STOREFRONT_PARENT_DOMAIN ?? '';
  const infrastructure = publicOrigins.map((origin) => new URL(origin).host);
  if (
    !publicPlatformDomain(parent) ||
    new Set(infrastructure).size !== infrastructure.length ||
    !infrastructure.every((host) => {
      const suffix = '.' + parent;
      return (
        host.endsWith(suffix) && dnsLabel.test(host.slice(0, -suffix.length))
      );
    })
  )
    throw new Error(
      'Hosted origins must use distinct first-level platform hostnames',
    );
  const pilots = (env.STOREFRONT_PILOT_HOSTS ?? '')
    .trim()
    .split(/ +/)
    .filter(Boolean);
  if (
    !pilots.length ||
    new Set(pilots).size !== pilots.length ||
    !pilots.every(
      (host) =>
        hostedTenantHost(host, parent) && !infrastructure.includes(host),
    )
  )
    throw new Error(
      'STOREFRONT_PILOT_HOSTS requires exact platform storefront hostnames',
    );
  return new Set(pilots);
}

const centralApis = new Set([
  'account',
  'notifications',
  'applicant-applications',
  'application-applicant',
  'application-documents',
  'application-progress',
  'customer-dashboard-layout',
  'customer-follow',
  'loyalty',
  'market-loyalty',
  'vendor-application-access',
]);

export function centralAccountPath(path: string) {
  if (
    path === '/' ||
    path === '/robots.txt' ||
    /^\/(?:account|auth|notifications)(?:\/|$)/.test(path) ||
    /^\/vendor\/application-(?:continue|return)\/?$/.test(path)
  )
    return true;
  const api = /^\/api\/([a-z-]+)\/?$/.exec(path);
  return !!api && centralApis.has(api[1]!);
}

export function singleHeader(request: IncomingMessage, name: string) {
  const values = request.headersDistinct[name];
  return values?.length === 1 ? values[0] : undefined;
}

export function validRequestTarget(
  target: string | undefined,
): target is string {
  return (
    !!target && /^\/(?!\/)/.test(target) && !/[\\#\x00-\x20\x7f]/.test(target)
  );
}

export function wireAuthority(request: IncomingMessage) {
  const value = singleHeader(request, 'host');
  if (
    !value ||
    /[%\\\s/@?#,]/.test(value) ||
    !validRequestTarget(request.url) ||
    URL.parse('https://' + value)?.host !== value
  )
    return undefined;
  return value;
}

export function hasForwardingHeaders(request: IncomingMessage) {
  return Object.keys(request.headersDistinct).some(
    (name) =>
      name === 'forwarded' ||
      name.startsWith('x-forwarded-') ||
      name === 'x-real-ip',
  );
}

export function ingressClient(request: IncomingMessage, key: string) {
  const assertion = singleHeader(request, 'x-market-ingress');
  const address = singleHeader(request, 'x-market-client-ip');
  if (
    !assertion ||
    !address ||
    address.includes('%') ||
    !isIP(address) ||
    request.headersDistinct['x-market-ssr'] ||
    request.headersDistinct['x-market-storefront-host'] ||
    hasForwardingHeaders(request) ||
    !timingSafeEqual(
      createHash('sha256').update(key).digest(),
      createHash('sha256').update(assertion).digest(),
    )
  )
    return undefined;
  return new SocketAddress({
    address,
    family: isIP(address) === 4 ? 'ipv4' : 'ipv6',
  }).address.replace(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/, '$1');
}

export function stripIngressHeaders(request: IncomingMessage) {
  for (const name of ['x-market-ingress', 'x-market-client-ip']) {
    delete request.headers[name];
    delete request.headersDistinct[name];
  }
  for (let index = request.rawHeaders.length - 2; index >= 0; index -= 2) {
    if (/^x-market-(ingress|client-ip)$/i.test(request.rawHeaders[index]!))
      request.rawHeaders.splice(index, 2);
  }
}
