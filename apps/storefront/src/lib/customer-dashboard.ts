import type { APIContext } from 'astro';
import {
  safeError,
  type CustomerDashboard,
  type CustomerPurchase,
  type CustomerSubjectPage,
} from '@market/api';
import {
  AccountBridgeError,
  accountBridge,
  isCentral,
  type CentralAccountData,
} from './account';
import { requestCheckout, requestCustomerDashboard } from './shop';

export const customerNavigation = [
  { href: '/account', label: 'Overview' },
  { href: '/account/orders', label: 'Order History' },
  { href: '/account/markets', label: 'Followed Markets' },
  { href: '/account/vendors', label: 'Favorite Vendors' },
  { href: '/account/settings', label: 'Account Settings' },
];
export function customerSkip(value: string | null) {
  const n = Number(value ?? 0);
  return Number.isSafeInteger(n) && n >= 0 && n <= 100000 ? n : 0;
}
export function customerAuthenticationError(error: unknown) {
  const kind = safeError(error).kind;
  return (
    kind === 'authentication' ||
    kind === 'forbidden' ||
    (error instanceof AccountBridgeError &&
      ([401, 403].includes(error.status) ||
        (error.status === 400 &&
          error.code === 'ACCOUNT_LINK_INVALID_OR_UNAVAILABLE')))
  );
}
export function customerReturn(value: string | null) {
  return value &&
    /^\/account(?:\/(markets|vendors))?(?:\?(?:[a-zA-Z0-9_%-]+=[a-zA-Z0-9_%+.-]*)(?:&[a-zA-Z0-9_%-]+=[a-zA-Z0-9_%+.-]*)*)?$/.test(
      value,
    )
    ? value
    : '/account';
}
export function customerApi(
  context: APIContext & { response?: { headers: Headers } },
  responseHeaders?: Headers,
) {
  const headers = responseHeaders ?? context.response?.headers ?? new Headers();
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  const central = isCentral(context.url);
  const capability =
    context.cookies.get('platform-unified-account')?.value ?? '';
  const bridge = <T>(action: string, data: Record<string, unknown> = {}) =>
    accountBridge<T>({ action, central: capability, ...data });
  const merchant = () => requestCustomerDashboard(context, headers);
  const checkout = () => requestCheckout(context, headers);
  let login = '/account/login';
  return {
    get login() {
      return login;
    },
    profile: async () => {
      if (!central) return checkout().profile();
      const data = await bridge<CentralAccountData>('centralProfile');
      if (!data.profile.phoneVerified) login = '/account/phone';
      return data.profile.phoneVerified ? data.profile : null;
    },
    contexts: async () =>
      central
        ? (await bridge<CentralAccountData>('centralProfile')).contexts
        : checkout().accountContexts(),
    read: (section = 'overview', skip = 0, eventSkip = 0) =>
      central
        ? bridge<CustomerDashboard>('customerDashboard', {
            section,
            skip,
            eventSkip,
          })
        : merchant().read(section, skip, eventSkip),
    subjects: (kind: string, search = '', skip = 0) =>
      central
        ? bridge<CustomerSubjectPage>('customerSubjects', {
            kind,
            search,
            skip,
          })
        : merchant().subjects(kind, search, skip),
    follow: (kind: string, id: string, following: boolean) =>
      central
        ? bridge<{ following: boolean }>('customerFollow', {
            kind,
            id,
            following,
          })
        : merchant().follow(kind, id, following),
    purchases: (skip = 0, take = 10) =>
      central
        ? bridge<{ totalItems: number; items: CustomerPurchase[] }>(
            'customerPurchases',
            { skip, take },
          )
        : checkout().purchases(skip, take),
    purchase: (id: string) =>
      central
        ? bridge<CustomerPurchase>('customerPurchase', { id })
        : checkout().purchase(id),
  };
}
export function eventDate(start: string, timezone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(start));
}
export function eventTime(start: string, end: string, timezone: string) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  return `${f.format(new Date(start))} to ${f.format(new Date(end))}`;
}
