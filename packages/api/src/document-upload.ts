import { print, type DocumentNode } from 'graphql';
import { AppError, backendError } from './errors';
export async function uploadDocumentFile(
  options: { endpoint: string; channelToken: string; fetch?: typeof fetch },
  document: DocumentNode,
  field: string,
  file: File,
  input: Record<string, unknown>,
) {
  if (!file.size || file.size > 10 * 1024 * 1024)
    throw new AppError('validation', 'DOCUMENT_TOO_LARGE');
  const body = new FormData();
  body.append(
    'operations',
    JSON.stringify({
      query: print(document),
      variables: {
        input,
        file: null,
      },
    }),
  );
  body.append('map', JSON.stringify({ '0': ['variables.file'] }));
  body.append('0', file);
  try {
    const response = await (options.fetch ?? fetch)(options.endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'vendure-token': options.channelToken,
        'Apollo-Require-Preflight': 'true',
      },
      body,
      signal: AbortSignal.timeout(60000),
    });
    const result = (await response.json()) as {
      data?: Record<string, unknown>;
      errors?: { extensions?: { code?: string } }[];
    };
    if (result.errors?.length)
      throw backendError(result.errors[0]?.extensions?.code, response.status);
    if (!response.ok || !result.data) throw new AppError('unavailable');
    return result.data[field];
  } catch (error) {
    throw error instanceof AppError ? error : new AppError('network');
  }
}
