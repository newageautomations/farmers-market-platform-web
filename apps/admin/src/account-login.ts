import { safeAdminDestination } from '@market/config';
import { isLegacyNotificationsPath } from '@market/admin-core';
import { AppError } from '@market/api';
import { createPlatformAccountApi } from '@market/api';
import { createAdminSession, type SessionState } from '@market/auth';
function returnCookie(name: string, value: string, maxAge = 1800) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/auth/account; SameSite=Lax; Max-Age=${maxAge}${window.location.protocol === 'https:' ? '; Secure' : ''}`;
}
function consumeReturnCookie(name: string) {
  const entry = document.cookie
    .split('; ')
    .find((c) => c.startsWith(name + '='));
  returnCookie(name, '', 0);
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}
export async function selectAuthorizedAccountContext(
  endpoint: string,
  session: SessionState,
) {
  if (session.status !== 'authenticated') return session;
  const url = new URL(window.location.href);
  if (
    url.searchParams.get('principal') &&
    url.searchParams.get('principal') !== session.user.id
  )
    throw new AppError('forbidden');
  const account = await createPlatformAccountApi({
    endpoint,
    channelToken: session.channel.token,
  }).contexts();
  if (url.pathname === '/platform' || url.pathname.startsWith('/platform/')) {
    if (!account.platformAdministrator) throw new AppError('forbidden');
    const channel = session.user.channels.find((c) =>
      c.permissions.includes('SuperAdmin'),
    );
    if (!channel) throw new AppError('forbidden');
    return createAdminSession(endpoint).restore(channel.id);
  }
  if (isLegacyNotificationsPath(url.pathname)) {
    // Former unscoped inbox links carry no role: use the linked workspace in
    // either role, else the current or first Vendor/Market workspace. The shell then moves the URL under
    // that role (/vendor/notifications, /market/notifications, ...).
    const workspaces = account.affiliations.filter(
      (a) => a.mode === 'VENDOR' || a.mode === 'MARKET_MANAGER',
    );
    const linked =
      workspaces.find((a) => a.channelId === url.searchParams.get('channel')) ??
      workspaces.find((a) => a.channelId === session.channel.id) ??
      workspaces[0];
    if (!linked) throw new AppError('forbidden');
    return createAdminSession(endpoint).restore(linked.channelId);
  }
  const mode = url.pathname.startsWith('/vendor')
    ? 'VENDOR'
    : url.pathname.startsWith('/market')
      ? 'MARKET_MANAGER'
      : null;
  const matches = account.affiliations.filter(
    (a) =>
      a.mode === mode &&
      (!url.searchParams.has('channel') ||
        a.channelId === url.searchParams.get('channel')),
  );
  if (matches.length !== 1) throw new AppError('forbidden');
  return createAdminSession(endpoint).restore(matches[0]!.channelId);
}
export const safeAdminReturn = safeAdminDestination;
export function platformAccountLogin(
  origin: string,
  expectedPrincipal?: string,
) {
  const url = new URL('/account/login', origin);
  const correlation = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
  )
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
  returnCookie('platform-admin-correlation', correlation);
  const path = window.location.pathname + window.location.search;
  if (safeAdminReturn(path)) returnCookie('platform-admin-destination', path);
  else returnCookie('platform-admin-destination', '', 0);
  url.searchParams.set('destination', safeAdminReturn(path) ?? '/');
  const principal =
    expectedPrincipal ??
    new URL(window.location.href).searchParams.get('principal');
  if (principal) url.searchParams.set('principal', principal);
  url.searchParams.set('origin', window.location.origin);
  url.searchParams.set('correlation', correlation);
  window.location.assign(url.toString());
}
export async function completePlatformAccountLogin(endpoint: string) {
  const current = new URL(window.location.href);
  if (current.searchParams.has('native')) {
    current.searchParams.delete('native');
    window.history.replaceState(
      null,
      '',
      current.pathname + current.search + current.hash,
    );
  }
  if (window.location.pathname !== '/auth/account') return;
  const code = new URL(window.location.href).searchParams.get('code'),
    correlation = consumeReturnCookie('platform-admin-correlation');
  const destination = consumeReturnCookie('platform-admin-destination');
  window.history.replaceState(
    null,
    '',
    safeAdminReturn(current.searchParams.get('returnTo') ?? '') ??
      (destination && safeAdminReturn(destination) ? destination : '/'),
  );
  try {
    if (
      !code ||
      !correlation ||
      !/^[A-Za-z0-9_-]{43}$/.test(code) ||
      !/^[A-Za-z0-9_-]{43}$/.test(correlation)
    )
      throw new Error('Account return invalid');
    await createPlatformAccountApi({ endpoint }).handoff(code, correlation);
  } catch (error) {
    // A failed return must never fall back to a different person's existing cookie on reload.
    const retry = new URL(window.location.href);
    retry.searchParams.set('account', '1');
    window.history.replaceState(null, '', retry.pathname + retry.search);
    throw error;
  }
}
