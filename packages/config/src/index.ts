import { z } from 'zod';
import {
  normalizeOrigin,
  runtimeMode,
  requireStrongSecret,
} from './security.ts';
export * from './security.ts';

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
export function validateEnvironment(
  input: Record<string, string | undefined>,
  mode: RuntimeMode,
) {
  const parsed = envSchema.parse(input);
  const production = runtimeMode(input) === 'production';
  if (production) {
    if (input.NODE_ENV !== 'production')
      throw new Error('NODE_ENV production required');
    for (const name of ['PLATFORM_ACCOUNT_ORIGIN', 'ADMIN_ORIGIN']) {
      if (!input[name] || !normalizeOrigin(input[name]).startsWith('https://'))
        throw new Error(`${name} requires HTTPS`);
    }
    if (
      input.PLATFORM_ACCOUNT_ORIGIN !==
      normalizeOrigin(input.PLATFORM_ACCOUNT_ORIGIN!)
    )
      throw new Error('PLATFORM_ACCOUNT_ORIGIN requires a canonical origin');
    for (const name of ['SHOP_API_URL', 'PUBLIC_ADMIN_API_URL'])
      if (
        !new URL(
          parsed[name as 'SHOP_API_URL' | 'PUBLIC_ADMIN_API_URL'],
        ).href.startsWith('https://')
      )
        throw new Error(`${name} requires HTTPS`);
    requireStrongSecret(
      input.PLATFORM_ACCOUNT_BRIDGE_KEY,
      'PLATFORM_ACCOUNT_BRIDGE_KEY',
    );
    if (input.TRUSTED_PROXY_CIDRS && input.TRUSTED_PROXY_CIDRS !== 'disabled')
      throw new Error(
        'Storefront adapter proxy trust is disabled; terminate HTTPS in the application',
      );
    if (
      Object.keys(input).some(
        (name) =>
          /^(PUBLIC_|VITE_).*(SECRET|PASSWORD|PRIVATE_KEY|BRIDGE_KEY|API_KEY|DATABASE_URL)/i.test(
            name,
          ) && input[name],
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
    shopApiUrl: parsed.SHOP_API_URL,
    adminApiUrl: parsed.PUBLIC_ADMIN_API_URL,
    fixtureMode: parsed.FRONTEND_FIXTURE_MODE === 'true',
  });
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
