export { safeAdminDestination } from './account-destination.ts';
export * from './remote-demo.ts';
import { z } from 'zod';
import { normalizeOrigin, requireStrongSecret } from './security.ts';
import {
  deploymentEnvironment,
  isLoopbackHost,
  validateDeploymentHost,
  validateStagingAdmission,
} from './deployment-environment.ts';
export * from './security.ts';
export * from './deployment-environment.ts';
export const platformName = 'Market platform';

const endpoint = z
  .url()
  .refine(
    (value) =>
      ['http:', 'https:'].includes(new URL(value).protocol) &&
      !new URL(value).username &&
      !new URL(value).password,
    'Use an HTTP API URL without credentials',
  );
const envSchema = z.object({
  SHOP_API_URL: endpoint,
  PUBLIC_ADMIN_API_URL: endpoint,
  FRONTEND_FIXTURE_MODE: z.enum(['true', 'false']).default('false'),
});
export type RuntimeMode = 'development' | 'test' | 'production';
type Environment = Record<string, string | undefined>;
type ConfigurationUse = 'build' | 'storefront-runtime' | 'admin-runtime';

export function validateEnvironment(
  input: Environment,
  mode: RuntimeMode,
  use: ConfigurationUse = 'storefront-runtime',
) {
  const identity = deploymentEnvironment(
    input,
    input.NODE_ENV === 'test' || mode === 'test' ? 'test' : 'dev',
  );
  const { deployment } = identity;
  const stagingPublicAdmission = validateStagingAdmission(input, deployment);
  if (
    stagingPublicAdmission &&
    use !== 'build' &&
    input.HOSTED_TRANSPORT !== 'railway-private'
  )
    throw new Error('Public staging requires the hosted frontend transport');
  const production = identity.mode === 'production';
  if (production && mode !== 'production')
    throw new Error('Hardened frontend requires a production build');
  const parsed = envSchema.parse(input);
  const adminOrigin = input.ADMIN_ORIGIN ?? '';
  const accountOrigin = input.PLATFORM_ACCOUNT_ORIGIN ?? '';
  const customerOrigin = input.CUSTOMER_STOREFRONT_ORIGIN ?? '';
  const assetUrl = input.ASSET_URL_PREFIX ?? '';
  let assetOrigin: string | undefined;
  const origin = (value: string, name: string) => {
    if (value !== normalizeOrigin(value) || !value.startsWith('https://'))
      throw new Error(`${name} requires a canonical HTTPS origin`);
    validateDeploymentHost(new URL(value).hostname, deployment, name);
  };
  if (production) {
    origin(adminOrigin, 'ADMIN_ORIGIN');
    origin(accountOrigin, 'PLATFORM_ACCOUNT_ORIGIN');
    if (customerOrigin) origin(customerOrigin, 'CUSTOMER_STOREFRONT_ORIGIN');
    for (const name of ['SHOP_API_URL', 'PUBLIC_ADMIN_API_URL'] as const) {
      const url = new URL(parsed[name]);
      origin(url.origin, name);
      const path = name === 'SHOP_API_URL' ? '/shop-api' : '/admin-api';
      if (
        url.href !== parsed[name] ||
        url.pathname !== path ||
        url.search ||
        url.hash
      )
        throw new Error(`${name} requires a canonical HTTPS API URL`);
    }
    if (assetUrl || (deployment === 'staging' && use !== 'admin-runtime')) {
      const url = URL.parse(assetUrl);
      if (
        !url ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.href !== assetUrl ||
        !url.pathname.endsWith('/')
      )
        throw new Error(
          'ASSET_URL_PREFIX requires a canonical HTTPS media URL',
        );
      origin(url.origin, 'ASSET_URL_PREFIX');
      assetOrigin = url.origin;
    } else if (use === 'admin-runtime') {
      // Hosted Admin can omit the prefix when the public API serves its assets.
      assetOrigin = new URL(parsed.PUBLIC_ADMIN_API_URL).origin;
    }
    if (use === 'storefront-runtime')
      requireStrongSecret(
        input.PLATFORM_ACCOUNT_BRIDGE_KEY,
        'PLATFORM_ACCOUNT_BRIDGE_KEY',
      );
    if (
      deployment === 'local-qualification' &&
      input.HOST &&
      !isLoopbackHost(input.HOST)
    )
      throw new Error('Local qualification requires a loopback listener');
    if (
      input.REMOTE_DEMO_ADMIN === 'true' ||
      input.DEMO_LOCAL_HOST_ALIASES === 'true'
    )
      throw new Error(
        'Demo proxy and host aliases are forbidden in hardened environments',
      );
    if (input.TRUSTED_PROXY_CIDRS && input.TRUSTED_PROXY_CIDRS !== 'disabled')
      throw new Error(
        'Generic proxy trust is disabled for the frontend',
      );
    if (
      Object.keys(input).some(
        (name) =>
          /^(PUBLIC_|VITE_)/i.test(name) && name !== 'PUBLIC_ADMIN_API_URL',
      )
    )
      throw new Error('Server secrets cannot use public environment prefixes');
  }
  if (
    parsed.FRONTEND_FIXTURE_MODE === 'true' &&
    (mode === 'production' || production || input.NODE_ENV === 'production')
  )
    throw new Error('Fixture mode is forbidden in production');
  return Object.freeze({
    deployment,
    stagingPublicAdmission,
    production,
    shopApiUrl: parsed.SHOP_API_URL,
    adminApiUrl: parsed.PUBLIC_ADMIN_API_URL,
    adminOrigin,
    accountOrigin,
    customerOrigin,
    assetUrl,
    assetOrigin,
    fixtureMode: parsed.FRONTEND_FIXTURE_MODE === 'true',
  });
}

export const frontendBuildManifest = '.deployment.json';

export function frontendBuildSettings(
  config: ReturnType<typeof validateEnvironment>,
  service: 'admin' | 'storefront',
) {
  return {
    deployment: config.deployment,
    adminOrigin: config.adminOrigin,
    accountOrigin: config.accountOrigin,
    adminApiUrl: config.adminApiUrl,
    ...(service === 'admin'
      ? { customerOrigin: config.customerOrigin }
      : { shopApiUrl: config.shopApiUrl, assetUrl: config.assetUrl }),
  };
}

export function assertFrontendBuild(
  build: unknown,
  config: ReturnType<typeof validateEnvironment>,
  service: 'admin' | 'storefront',
) {
  const expected = frontendBuildSettings(config, service);
  if (
    !build ||
    typeof build !== 'object' ||
    Object.entries(expected).some(
      ([key, value]) =>
        !Object.hasOwn(build, key) ||
        (build as Record<string, unknown>)[key] !== value,
    )
  )
    throw new Error('Frontend runtime requires matching build configuration');
}

export function formatMoney(
  value: string | bigint | number,
  currency: string,
  locale = 'en-US',
): string {
  if (typeof value === 'number' && !Number.isSafeInteger(value))
    throw new Error('Money must be an exact safe integer');
  if (typeof value === 'string' && !/^-?\d+$/.test(value))
    throw new Error('Money must be integer minor units');
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Invalid currency code');
  const amount = BigInt(value);
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  });
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  const base = 10n ** BigInt(digits);
  const absolute = amount < 0n ? -amount : amount;
  const whole = absolute / base;
  const fraction = (absolute % base).toString().padStart(digits, '0');
  // Format bigint whole units exactly, then replace only fractional digits.
  const parts = formatter.formatToParts(amount < 0n ? -whole : whole);
  if (amount < 0n && whole === 0n) {
    return formatter
      .formatToParts(-1)
      .map((part) =>
        part.type === 'integer'
          ? '0'
          : part.type === 'fraction'
            ? fraction
            : part.value,
      )
      .join('');
  }
  return parts
    .map((part) => (part.type === 'fraction' ? fraction : part.value))
    .join('');
}
export function formatDate(value: string, timezone: string, locale = 'en-US') {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(new Date(value));
}
/** Exact decimal input to a GraphQL Int in the canonical currency's minor units. */
export function parsePrice(value: string, currency: string): number {
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Invalid currency');
  const digits =
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
  const pattern =
    digits === 0 ? /^\d+$/ : new RegExp(`^\\d+(?:\\.\\d{1,${digits}})?$`);
  if (!pattern.test(value))
    throw new Error('Enter an exact non-negative price');
  const [whole = '', fraction = ''] = value.split('.');
  const minor =
    BigInt(whole) * 10n ** BigInt(digits) +
    BigInt(fraction.padEnd(digits, '0') || '0');
  if (minor > 2147483647n) throw new Error('Price exceeds supported range');
  return Number(minor);
}
export function pageWindow(skip = 0, take = 20) {
  if (
    !Number.isSafeInteger(skip) ||
    skip < 0 ||
    !Number.isSafeInteger(take) ||
    take < 1 ||
    take > 100
  )
    throw new Error('Invalid pagination');
  return { skip, take };
}
