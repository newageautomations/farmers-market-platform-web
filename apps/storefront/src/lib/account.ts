import { safeAdminDestination } from '@market/config';
import type { APIContext } from 'astro';
import { randomBytes } from 'node:crypto';
import { AppError } from '@market/api';
export interface CentralAccountData {
  profile: {
    timezone?: string | null;
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
    platformAdministrator?: boolean;
    principalId?: string;
    affiliations: Array<{
      mode: 'VENDOR' | 'MARKET_MANAGER';
      id: number;
      name: string;
      channelId: string;
      canApply?: boolean;
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
export function safeAccountReturn(value: string | null | undefined) {
  if (value === '/account/invitation') return value;
  if (
    value &&
    value.length <= 1024 &&
    /^\/(?:account(?:\/(?:orders(?:\/[1-9]\d*)?|settings|communications|markets|vendors|loyalty|workspaces|onboarding\/(?:vendor|market)))?|notifications)(?:\?[A-Za-z0-9_%=&.+:-]*)?$/.test(
      value,
    )
  )
    return value;
  if (
    value &&
    /^\/vendor\/application-return\?(?:draft=[1-9]\d*|claim=[1-9]\d*|slug=[a-zA-Z0-9-]{1,80})(?:&vendor=[1-9]\d*)?$/.test(
      value,
    )
  )
    return value;
  return value &&
    /^\/(account|apply(?:\/[a-zA-Z0-9-]{1,80})?)(?:\?draft=[1-9]\d*)?$/.test(
      value,
    )
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
export async function defaultAccountDestination(central: string) {
  const account = await accountBridge<CentralAccountData>({
    action: 'centralProfile',
    central,
  });
  if (!account.profile.phoneVerified) return '/account/phone';
  return account.contexts.affiliations.length ||
    account.contexts.platformAdministrator
    ? '/account/workspaces'
    : '/account';
}
export async function authorizeUnifiedAccount(
  central: string,
  origin: string,
  correlation: string,
  destination = '/',
  principal = '',
) {
  if (origin === process.env.ADMIN_ORIGIN && destination === '/')
    return { central, callback: await defaultAccountDestination(central) };
  if (origin === process.env.ADMIN_ORIGIN && !safeAdminDestination(destination))
    throw new Error('Invalid destination');
  try {
    return await accountBridge<{ central: string; callback: string }>({
      action: 'unifiedAuthorize',
      central,
      origin,
      correlation,
      destination,
      principal,
    });
  } catch (error) {
    if (
      origin !== process.env.ADMIN_ORIGIN ||
      !(error instanceof AccountBridgeError) ||
      error.status !== 400
    )
      throw error;
    await accountBridge({ action: 'centralProfile', central });
    return { central, callback: '/account/workspaces?unavailable=1' };
  }
}
export async function centralSignIn(
  context: APIContext & {
    locals: {
      storefront?: import('@market/storefront-core').StorefrontContext;
    };
  },
  returnTo = '/account',
  entry: 'login' | 'signup' | 'vendor-applications' = 'login',
) {
  const origin = context.locals.storefront?.canonicalOrigin;
  if (!origin) throw new AppError('forbidden');
  const correlation = randomBytes(32).toString('base64url');
  const continuationAge =
    entry !== 'login' ||
    returnTo.startsWith('/apply') ||
    returnTo.startsWith('/account/applications')
      ? 1800
      : 120;
  context.cookies.set('account-correlation', correlation, {
    httpOnly: true,
    secure: context.url.protocol === 'https:',
    sameSite: 'lax',
    path: '/auth/callback',
    maxAge: continuationAge,
  });
  context.cookies.set('account-return', safeAccountReturn(returnTo), {
    httpOnly: true,
    secure: context.url.protocol === 'https:',
    sameSite: 'lax',
    path: '/auth/callback',
    maxAge: continuationAge,
  });
  const target = new URL(`/account/${entry}`, accountOrigin());
  const requestedRole = context.url.searchParams.get('context');
  if (requestedRole === 'vendor' || requestedRole === 'market')
    target.searchParams.set('context', requestedRole);
  target.searchParams.set('origin', origin);
  target.searchParams.set('correlation', correlation);
  return target.toString();
}
