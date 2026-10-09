import type { APIContext } from 'astro';
import { randomBytes } from 'node:crypto';
import { AppError } from '@market/api';
export function accountOrigin() {
  const value = process.env.PLATFORM_ACCOUNT_ORIGIN;
  if (!value) throw new AppError('unavailable');
  const url = new URL(value);
  if (
    url.origin !== value ||
    url.username ||
    url.password ||
    (url.protocol !== 'https:' &&
      !(
        url.protocol === 'http:' &&
        url.hostname.endsWith('.localhost') &&
        process.env.APP_ENV !== 'production' &&
        process.env.NODE_ENV !== 'production'
      ))
  )
    throw new AppError('unavailable');
  return value;
}
export function isCentral(url: URL) {
  return (
    !!process.env.PLATFORM_ACCOUNT_ORIGIN &&
    url.origin === process.env.PLATFORM_ACCOUNT_ORIGIN
  );
}
export async function accountBridge<T>(
  input: Record<string, unknown>,
): Promise<T> {
  const endpoint = process.env.SHOP_API_URL,
    key = process.env.PLATFORM_ACCOUNT_BRIDGE_KEY;
  if (!endpoint || !key || key.length < 32) throw new AppError('unavailable');
  const response = await fetch(new URL('/customer-account-bridge', endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-account-bridge': key,
      'x-account-origin': accountOrigin(),
    },
    body: JSON.stringify(input),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new AppError('authentication');
  return response.json() as Promise<T>;
}
export function setCentral(context: APIContext, value: string) {
  context.cookies.set('platform-account', value, {
    httpOnly: true,
    secure: new URL(accountOrigin()).protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: 604800,
  });
}
export async function centralSignIn(context: APIContext) {
  const origin = context.locals.storefront?.canonicalOrigin;
  if (!origin) throw new AppError('forbidden');
  const correlation = randomBytes(32).toString('base64url');
  context.cookies.set('account-correlation', correlation, {
    httpOnly: true,
    secure: context.url.protocol === 'https:',
    sameSite: 'lax',
    path: '/auth/callback',
    maxAge: 120,
  });
  const target = new URL('/account/sign-in', accountOrigin());
  target.searchParams.set('origin', origin);
  target.searchParams.set('correlation', correlation);
  return target.toString();
}
