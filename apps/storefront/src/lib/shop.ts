import {
  AppError,
  createStorefrontApi,
  createMarketStorefrontApi,
  createCheckoutApi,
  createCustomerDashboardApi,
  createPreferenceApi,
  createPublicMarketOperationsApi,
  createApplicationDocumentsApi,
  createInboxApi,
  createPublicContactApi,
  createMarketDayStorefrontApi,
} from '@market/api';
import type { APIContext } from 'astro';
import { apiRequestAddress, backendFetch } from './private-api';

function requestOptions(
  context: Pick<APIContext, 'locals' | 'request'>,
  responseHeaders?: Headers,
) {
  const storefront = context.locals.storefront;
  if (
    storefront?.source !== 'backend' ||
    !storefront.channelToken ||
    !storefront.subjectId ||
    !context.locals.shopApiUrl
  )
    throw new AppError('forbidden');
  // Request-local cookie transport. Vendure owns session, context, prices and active Order.
  let cookie = context.locals.editorPreview
    ? ''
    : (context.request.headers.get('cookie') ?? '');
  if (process.env.HOSTED_TRANSPORT === 'railway-private')
    cookie = cookie
      .split(';')
      .filter((part) => !/^\s*(?:CF_Authorization|CF_AppSession)=/i.test(part))
      .join(';');
  const requestFetch: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (process.env.PLATFORM_ACCOUNT_BRIDGE_KEY)
      headers.set(
        'x-storefront-bridge',
        process.env.PLATFORM_ACCOUNT_BRIDGE_KEY,
      );
    if (cookie) headers.set('cookie', cookie);
    const response = await backendFetch(input, {
      ...init,
      headers,
      cache: 'no-store',
    });
    for (const value of response.headers.getSetCookie()) {
      responseHeaders?.append('Set-Cookie', value);
      const pair = value.split(';')[0]!;
      const name = pair.split('=')[0];
      cookie = [
        ...cookie
          .split(';')
          .map((v) => v.trim())
          .filter((v) => v && v.split('=')[0] !== name),
        pair,
      ].join('; ');
    }
    return response;
  };
  return {
    endpoint: context.locals.shopApiUrl,
    channelToken: storefront.channelToken,
    fetch: requestFetch,
  };
}
export function requestInbox(
  context: Pick<APIContext, 'locals' | 'request'>,
  responseHeaders?: Headers,
) {
  return createInboxApi({
    ...requestOptions(context, responseHeaders),
    api: 'shop',
  });
}
export function requestCheckout(
  context: Pick<APIContext, 'locals' | 'request'>,
  responseHeaders?: Headers,
) {
  return createCheckoutApi(requestOptions(context, responseHeaders));
}
export function requestCustomerDashboard(
  context: Pick<APIContext, 'locals' | 'request'>,
  responseHeaders?: Headers,
) {
  return createCustomerDashboardApi(requestOptions(context, responseHeaders));
}
export function requestPreferences(
  context: Pick<APIContext, 'locals' | 'request'>,
  responseHeaders?: Headers,
) {
  return createPreferenceApi(requestOptions(context, responseHeaders));
}
export function requestShop(
  context: Pick<APIContext, 'locals' | 'request'>,
  responseHeaders?: Headers,
) {
  if (context.locals.storefront?.kind !== 'VENDOR')
    throw new AppError('forbidden');
  return createStorefrontApi({
    ...requestOptions(context, responseHeaders),
    vendorId: context.locals.storefront.subjectId!,
  });
}
export function requestMarketShop(
  context: Pick<APIContext, 'locals' | 'request'>,
  responseHeaders?: Headers,
) {
  if (context.locals.storefront?.kind !== 'MARKET')
    throw new AppError('forbidden');
  return createMarketStorefrontApi({
    ...requestOptions(context, responseHeaders),
    marketId: context.locals.storefront.subjectId!,
  });
}
export function requestPublicMarketOperations(
  context: Pick<APIContext, 'locals' | 'request'>,
) {
  if (context.locals.storefront?.kind !== 'MARKET')
    throw new AppError('forbidden');
  return createPublicMarketOperationsApi(requestOptions(context));
}
export function requestApplicationDocuments(
  context: Pick<APIContext, 'locals' | 'request'>,
  application: { slug: string; vendorId: number },
) {
  if (context.locals.storefront?.kind !== 'MARKET')
    throw new AppError('forbidden');
  const options = requestOptions(context);
  const storefrontId = context.locals.storefront.storefrontId;
  return createApplicationDocumentsApi({
    ...options,
    fetch: async (url, init) => {
      if (!(init?.body instanceof FormData)) return options.fetch(url, init);
      if (!storefrontId) throw new AppError('forbidden');
      const headers = new Headers(init.headers);
      headers.set('x-storefront-id', storefrontId);
      const response = await options.fetch(url, { ...init, headers });
      if (response.status === 403) {
        await response.body?.cancel();
        throw new AppError('forbidden', 'FORBIDDEN');
      }
      return response;
    },
    application,
  });
}

export const loyaltyTransport = requestOptions;

export function requestMarketDay(
  context: Pick<APIContext, 'locals' | 'request'>,
  headers?: Headers,
) {
  if (context.locals.storefront?.kind !== 'MARKET')
    throw new AppError('forbidden');
  return createMarketDayStorefrontApi(requestOptions(context, headers));
}

export function requestContact(context: APIContext, headers: Headers) {
  const options = requestOptions(context, headers);
  return createPublicContactApi({
    ...options,
    fetch: (url, init) => {
      const outbound = new Headers(init?.headers);
      outbound.set(
        'x-storefront-origin',
        context.locals.storefront!.canonicalOrigin,
      );
      outbound.set(
        'x-contact-client',
        apiRequestAddress.getStore() ?? context.clientAddress,
      );
      return options.fetch(url, { ...init, headers: outbound });
    },
  });
}
