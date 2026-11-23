import { AsyncLocalStorage } from 'node:async_hooks';
import { AppError } from '@market/api';
import { storefrontPrivateApi } from '@market/config/hosted';

export const apiRequestAddress = new AsyncLocalStorage<string>();

const privateApi = storefrontPrivateApi(process.env);

export function shopTransportEndpoint(publicEndpoint: string) {
  return privateApi
    ? new URL('/shop-api', privateApi.origin).href
    : publicEndpoint;
}

export function adminPreviewTransportEndpoint(publicEndpoint: string) {
  return privateApi
    ? new URL('/admin-api', privateApi.origin).href
    : publicEndpoint;
}

export const backendFetch: typeof fetch = (input, init) => {
  if (!privateApi) return fetch(input, init);
  const endpoint = new URL(String(input));
  const address = apiRequestAddress.getStore();
  if (endpoint.origin !== privateApi.origin || !address)
    throw new AppError('unavailable');
  return fetch(endpoint, {
    ...init,
    headers: privateHeaders(address, init?.headers),
    redirect: 'error',
  });
};

function privateHeaders(address: string, initial?: HeadersInit) {
  const headers = new Headers(initial);
  headers.set('x-market-ssr', privateApi!.key);
  headers.set('x-market-client-ip', address);
  return headers;
}

export function resolverTransport() {
  if (!privateApi) return;
  const address = apiRequestAddress.getStore();
  if (!address) throw new AppError('unavailable');
  return { origin: privateApi.origin, headers: privateHeaders(address) };
}
