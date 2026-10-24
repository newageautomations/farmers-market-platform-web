import type { APIRoute } from 'astro';
import { boundedBody } from '@market/config';
import { safeError } from '@market/api';
import { AccountBridgeError } from '../../lib/account';
import { marketChallengeApi } from '../../lib/market-loyalty';
export const POST: APIRoute = async (context) => {
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'Content-Type': 'application/json',
    'X-Robots-Tag': 'noindex, nofollow',
  });
  if (context.request.headers.get('origin') !== context.url.origin)
    return new Response(null, { status: 403, headers });
  try {
    const body = JSON.parse(await boundedBody(context.request, 1024)) as {
      action: string;
      id?: number;
    };
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      !['list', 'claim'].includes(body.action) ||
      Object.keys(body).some((k) => !['action', 'id'].includes(k)) ||
      (body.action === 'claim' &&
        (!Number.isSafeInteger(body.id) || body.id! < 1))
    )
      return new Response(null, { status: 400, headers });
    const api = marketChallengeApi(context, headers);
    return new Response(
      JSON.stringify(
        body.action === 'list' ? await api.my() : await api.claim(body.id!),
      ),
      { headers },
    );
  } catch (error) {
    const kind = safeError(error).kind;
    return new Response(null, {
      status:
        error instanceof AccountBridgeError &&
        [400, 401, 403].includes(error.status)
          ? error.status
          : kind === 'authentication'
            ? 401
            : kind === 'forbidden'
              ? 403
              : kind === 'validation'
                ? 400
                : 503,
      headers,
    });
  }
};
