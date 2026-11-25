import { AsyncLocalStorage } from 'node:async_hooks';
import { AppError } from '@market/api';
import {
  storefrontPrivateApi,
  storefrontPrivateHeaders,
} from '@market/config/hosted';

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
    headers: storefrontPrivateHeaders(privateApi.key, address, init?.headers),
    redirect: 'error',
  });
};
