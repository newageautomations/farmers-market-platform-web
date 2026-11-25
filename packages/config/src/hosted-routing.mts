type Environment = Record<string, string | undefined>;

const dnsLabelSource = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';
export const dnsLabel = new RegExp(`^${dnsLabelSource}$`);

// Keep claims and hosted resolution aligned with src/hosted-api.ts in the API project.
const reservedLabels = [
  'admin',
  'api',
  'auth',
  'www',
  'app',
  'account',
  'assets',
  'media',
  'static',
  'cdn',
  'mail',
  'support',
  'status',
  'docs',
  'billing',
  'payments',
  'staging',
  'production',
  'dev',
  'healthcheck',
  'ingress',
  'gateway',
];
const reservedPrefixes = ['staging-', 'production-', 'dev-', 'xn--'];
const legacyPilotLabels = ['staging-vendor', 'staging-market'];

function publicPlatformDomain(host: string) {
  return (
    host === host.trim() &&
    host.length <= 251 &&
    host.split('.').every((label) => dnsLabel.test(label)) &&
    /\.[a-z]{2,63}$/.test(host) &&
    !/\.(?:localhost|localdomain|local|internal|railway\.app|pages\.dev|workers\.dev|trycloudflare\.com)$/.test(
      '.' + host,
    )
  );
}

export function hostedRouting(
  env: Environment,
  infrastructure: readonly string[],
  explicitFallbackParent = '',
) {
  const mode = env.STOREFRONT_ROUTING_MODE ?? 'explicit';
  if (mode !== 'explicit' && mode !== 'dynamic')
    throw new Error('STOREFRONT_ROUTING_MODE must be explicit or dynamic');
  const parent =
    env.STOREFRONT_PARENT_DOMAIN ??
    (mode === 'explicit' ? explicitFallbackParent : '');
  if (!publicPlatformDomain(parent))
    throw new Error('STOREFRONT_PARENT_DOMAIN requires a public DNS domain');
  const suffix = parent.replaceAll('.', '[.]');
  const tenantPattern = `^${dnsLabelSource}[.]${suffix}$`;
  const firstLevel = new RegExp(tenantPattern);
  const valid = (host: string) =>
    host === host.trim() && host.length <= 253 && firstLevel.test(host);
  if (
    new Set(infrastructure).size !== infrastructure.length ||
    !infrastructure.every(valid)
  )
    throw new Error(
      'Hosted origins must use distinct first-level platform hostnames',
    );

  const reservedPattern = `^(?:${reservedLabels.join('|')}|(?:${reservedPrefixes.join('|')})[a-z0-9-]*)[.]${suffix}$`;
  const reserved = new RegExp(reservedPattern);
  const legacyPilots = legacyPilotLabels.map((label) => `${label}.${parent}`);
  const pilots = (env.STOREFRONT_PILOT_HOSTS ?? '')
    .trim()
    .split(/ +/)
    .filter(Boolean);
  if (
    (mode === 'explicit' && !pilots.length) ||
    new Set(pilots).size !== pilots.length ||
    !pilots.every(
      (host) =>
        valid(host) &&
        !infrastructure.includes(host) &&
        (!reserved.test(host) || legacyPilots.includes(host)),
    )
  )
    throw new Error(
      'STOREFRONT_PILOT_HOSTS requires exact platform storefront hostnames',
    );

  return {
    mode,
    parent,
    pilots,
    tenantPattern,
    reservedPattern,
    allows(host: string) {
      return (
        pilots.includes(host) ||
        (mode === 'dynamic' &&
          valid(host) &&
          !infrastructure.includes(host) &&
          !reserved.test(host))
      );
    },
  };
}
