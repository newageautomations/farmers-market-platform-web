import { createPlatformAccountApi } from '@market/api';
import { createAdminSession, type SessionState } from '@market/auth';
function returnCookie(name: string, value: string, maxAge = 120) {
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
  if (
    !new URL(window.location.href).searchParams.has('channel') &&
    session.channel.permissions.some((p) =>
      ['ReadOwnVendorIdentity', 'ReadOwnMarket', 'SuperAdmin'].includes(p),
    )
  )
    return session;
  const account = await createPlatformAccountApi({
    endpoint,
    channelToken: session.channel.token,
  }).contexts();
  const business =
    account.affiliations.find(
      (a) =>
        a.channelId ===
        new URL(window.location.href).searchParams.get('channel'),
    ) ?? account.affiliations[0];
  return business
    ? createAdminSession(endpoint).restore(business.channelId)
    : session;
}
export function platformAccountLogin(origin: string) {
  const url = new URL('/account/login', origin);
  const correlation = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
  )
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
  returnCookie('platform-admin-correlation', correlation);
  const path = window.location.pathname + window.location.search;
  if (/^\/(vendor|market)(\?channel=\d+)?$/.test(path))
    returnCookie('platform-admin-destination', path);
  else returnCookie('platform-admin-destination', '', 0);
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
    destination && /^\/(vendor|market)(\?channel=\d+)?$/.test(destination)
      ? destination
      : '/',
  );
  if (
    !code ||
    !correlation ||
    !/^[A-Za-z0-9_-]{43}$/.test(code) ||
    !/^[A-Za-z0-9_-]{43}$/.test(correlation)
  )
    throw new Error('Account return invalid');
  await createPlatformAccountApi({ endpoint }).handoff(code, correlation);
}
