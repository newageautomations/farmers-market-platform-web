import type { APIContext } from 'astro';
import { randomBytes } from 'node:crypto';
import { AppError } from '@market/api';
export interface CentralAccountData {
  profile: {
    firstName: string;
    lastName: string;
    emailAddress: string;
    phoneNumber: string;
    verified: boolean;
    phoneVerified: boolean;
    emailVerified: boolean;
    needsPassword?: boolean;
  };
  contexts: {
    affiliations: Array<{
      mode: 'VENDOR' | 'MARKET_MANAGER';
      id: number;
      name: string;
      channelId: string;
    }>;
    onboarding: Array<{
      role: string;
      state: string;
      revision?: number;
      draft?: Record<string, string>;
      reviewNote?: string;
    }>;
  };
  preferences: Array<{ role: string; updatesEnabled: boolean }>;
}
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
const accountErrors: Record<string, string> = {
  PASSWORD_INVALID:
    'Use 12 to 72 characters with an uppercase letter, a number and a special character. Use English letters, numbers and keyboard symbols without spaces.',
  PASSWORD_MISMATCH: 'Passwords do not match.',
  INPUT_INVALID:
    'Check your name, email and complete phone number for the selected country.',
  SMS_RATE_LIMITED:
    'A new code could not be sent yet. Please wait before trying again.',
  SMS_UNAVAILABLE:
    'SMS delivery is temporarily unavailable. Please try again later.',
  ACCOUNT_UNAVAILABLE:
    'Account verification is temporarily unavailable. Please try again later.',
  ACCOUNT_LINK_INVALID_OR_UNAVAILABLE:
    'Verification could not be completed. Check the current code or restart signup if it has expired.',
};
export class AccountBridgeError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly retryAt?: string,
    readonly serverTime?: string,
  ) {
    const seconds =
      retryAt && serverTime
        ? Math.max(
            1,
            Math.ceil((Date.parse(retryAt) - Date.parse(serverTime)) / 1000),
          )
        : NaN;
    const wait =
      seconds < 60
        ? `${seconds} seconds`
        : `${Math.ceil(seconds / 60)} minute${Math.ceil(seconds / 60) === 1 ? '' : 's'}`;
    super(
      (accountErrors[code] ?? accountErrors.ACCOUNT_UNAVAILABLE) +
        (code === 'SMS_RATE_LIMITED' && Number.isFinite(seconds)
          ? ` Try again in about ${wait}.`
          : ''),
    );
  }
}
export async function accountBridge<T>(
  input: Record<string, unknown>,
): Promise<T> {
  const endpoint = process.env.SHOP_API_URL,
    key = process.env.PLATFORM_ACCOUNT_BRIDGE_KEY;
  if (!endpoint || !key || key.length < 32) throw new AppError('unavailable');
  let response: Response;
  try {
    response = await fetch(new URL('/customer-account-bridge', endpoint), {
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
  } catch {
    throw new AccountBridgeError('ACCOUNT_UNAVAILABLE', 503);
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      code?: string;
      retryAt?: string;
      serverTime?: string;
    };
    throw new AccountBridgeError(
      body.code && accountErrors[body.code] ? body.code : 'ACCOUNT_UNAVAILABLE',
      response.status,
      body.retryAt,
      body.serverTime,
    );
  }
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
export function safeAccountReturn(value: string | null | undefined) {
  return value && /^\/(account|apply(?:\/[a-zA-Z0-9-]{1,80})?)$/.test(value)
    ? value
    : '/account';
}
export function setUnifiedCentral(context: APIContext, value: string) {
  context.cookies.set('platform-unified-account', value, {
    httpOnly: true,
    secure: new URL(accountOrigin()).protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: 604800,
  });
}
/** Admin authority stays with the existing handoff. A denied workspace return
 * can still use its validated personal account, without acquiring Admin grants. */
export async function authorizeUnifiedAccount(
  central: string,
  origin: string,
  correlation: string,
) {
  try {
    return await accountBridge<{ central: string; callback: string }>({
      action: 'unifiedAuthorize',
      central,
      origin,
      correlation,
    });
  } catch (error) {
    if (
      origin !== process.env.ADMIN_ORIGIN ||
      !/^[A-Za-z0-9_-]{43}$/.test(correlation) ||
      !(error instanceof AccountBridgeError) ||
      error.status !== 400 ||
      error.code !== 'ACCOUNT_LINK_INVALID_OR_UNAVAILABLE'
    )
      throw error;
    const account = await accountBridge<CentralAccountData>({
      action: 'centralProfile',
      central,
    });
    if (!account.profile.phoneVerified) throw error;
    return { central, callback: '/account' };
  }
}
export async function centralSignIn(
  context: APIContext & {
    locals: {
      storefront?: import('@market/storefront-core').StorefrontContext;
    };
  },
  unified = false,
  returnTo = '/account',
) {
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
  if (unified)
    context.cookies.set('account-return', safeAccountReturn(returnTo), {
      httpOnly: true,
      secure: context.url.protocol === 'https:',
      sameSite: 'lax',
      path: '/auth/callback',
      maxAge: 120,
    });
  const target = new URL(
    unified ? '/account/login' : '/account/sign-in',
    accountOrigin(),
  );
  target.searchParams.set('origin', origin);
  target.searchParams.set('correlation', correlation);
  return target.toString();
}
