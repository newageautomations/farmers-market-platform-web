import { AppError } from '@market/api';
import type { StorefrontAction } from '@market/api';
export async function shopCall<T>(
  storefrontId: string,
  action: StorefrontAction,
  input: Record<string, unknown> = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api/shop', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storefrontId, action, ...input }),
    });
  } catch {
    throw new AppError('network');
  }
  const payload = await response.json();
  if (!response.ok || payload.error)
    throw new AppError(
      payload.error?.kind ?? 'unavailable',
      payload.error?.code,
    );
  return payload.result as T;
}
