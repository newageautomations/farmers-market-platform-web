import { print, type DocumentNode } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { AppError, backendError } from './errors';
import { RequestTimeoutError, withRequestTimeout } from './request-timeout';

// Internal only. Public feature code receives named application APIs, never raw execute().
export type ApiKind = 'shop' | 'admin';
export type Operation<K extends ApiKind, R, V> = {
  readonly api: K;
  readonly document: TypedDocumentNode<R, V>;
};
export interface TransportOptions {
  endpoint: string;
  channelToken?: string;
  fetch?: typeof fetch;
  diagnostic?: (event: {
    api: ApiKind;
    kind: string;
    requestId: string;
  }) => void;
}
export function transport<K extends ApiKind>(
  api: K,
  options: TransportOptions,
) {
  const url = new URL(options.endpoint);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new AppError('validation');
  return async function execute<R, V>(
    operation: Operation<K, R, V>,
    variables: V,
    optionsForRequest: { signal?: AbortSignal } = {},
  ): Promise<R> {
    if (operation.api !== api) throw new AppError('validation');
    if (api === 'shop' && !options.channelToken?.trim())
      throw new AppError('forbidden', 'SHOP_CONTEXT_REQUIRED');
    const requestId = crypto.randomUUID();
    try {
      return await withRequestTimeout(
        8000,
        async (signal) => {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (options.channelToken)
            headers['vendure-token'] = options.channelToken;
          const response = await (options.fetch ?? fetch)(url, {
            method: 'POST',
            credentials: 'include',
            headers,
            signal,
            body: JSON.stringify({
              query: print(operation.document as DocumentNode),
              variables,
            }),
          });
          let payload: unknown;
          try {
            payload = await response.json();
          } catch {
            throw new AppError(
              response.status >= 500 ? 'unavailable' : 'graphql',
            );
          }
          if (!payload || typeof payload !== 'object')
            throw new AppError('graphql');
          if (
            'errors' in payload &&
            Array.isArray(payload.errors) &&
            payload.errors.length
          ) {
            const first: unknown = payload.errors[0];
            const ext =
              first && typeof first === 'object' && 'extensions' in first
                ? first.extensions
                : undefined;
            const code =
              ext && typeof ext === 'object' && 'code' in ext
                ? ext.code
                : undefined;
            // Farmers Market version conflicts use this exact public sentinel under BAD_USER_INPUT.
            // Never forward arbitrary backend messages or inspect stack/provider/database objects.
            const staleDomain =
              code === 'BAD_USER_INPUT' &&
              first &&
              typeof first === 'object' &&
              'message' in first &&
              (first.message === 'STALE_DOMAIN_VERSION' ||
                first.message ===
                  'Employee access changed. Reload the team before saving.');
            const error = backendError(
              staleDomain
                ? 'STALE_DOMAIN_VERSION'
                : code === 'BAD_USER_INPUT' &&
                    first &&
                    typeof first === 'object' &&
                    'message' in first &&
                    typeof first.message === 'string' &&
                    [
                      'INVALID_REWARD_FIELD',
                      'INVALID_REWARD_CONFIGURATION',
                      'REWARD_PRODUCT_UNAVAILABLE',
                      'REWARD_NOT_EDITABLE',
                    ].includes(first.message)
                  ? first.message
                  : code,
              response.status,
            );
            if (
              ['APPLICATION_CLOSED', 'APPLICATION_NOT_YET_OPEN'].includes(
                String(code),
              ) &&
              ext &&
              typeof ext === 'object' &&
              'applicationMessage' in ext &&
              typeof ext.applicationMessage === 'string' &&
              ext.applicationMessage.length <= 240
            )
              error.message = ext.applicationMessage;
            throw error;
          }
          if (!response.ok) throw backendError(undefined, response.status);
          if (
            !('data' in payload) ||
            payload.data == null ||
            typeof payload.data !== 'object'
          )
            throw new AppError('graphql');
          // Field-level result is generated from validated operations; wire shape is checked above.
          return payload.data as R;
        },
        optionsForRequest.signal,
      );
    } catch (error) {
      const normalized =
        error instanceof AppError
          ? error
          : new AppError(
              error instanceof RequestTimeoutError ? 'unavailable' : 'network',
            );
      options.diagnostic?.({ api, kind: normalized.kind, requestId });
      throw normalized;
    }
  };
}
