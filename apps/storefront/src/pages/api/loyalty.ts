import type { APIRoute } from 'astro';
import { boundedBody } from '@market/config';
import { safeError } from '@market/api';
import { loyaltyApi } from '../../lib/loyalty';
export const POST: APIRoute = async (context) => {
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'Content-Type': 'application/json',
    'X-Robots-Tag': 'noindex, nofollow',
  });
  if (context.request.headers.get('origin') !== context.url.origin)
    return new Response(null, { status: 403, headers });
  try {
    const body = JSON.parse(await boundedBody(context.request, 4096)) as {
      action: string;
      versionId?: number;
      redemptionId?: number;
      orderId?: string;
    };
    const api = loyaltyApi(context, headers);
    if (!['checkout', 'apply', 'remove'].includes(body.action))
      return new Response(null, { status: 400, headers });
    let result =
      body.action === 'checkout'
        ? await api.checkout()
        : body.action === 'remove'
          ? await api.remove(body.redemptionId ?? 0, body.orderId)
          : await api.apply(body.versionId ?? 0, body.orderId);
    if (body.action === 'checkout') {
      const saved = context.cookies.get('loyalty-preselection')?.value;
      if (saved && /^[1-9]\d*$/.test(saved) && Number(saved) <= 2147483647)
        result = { ...result, preferredVersionId: Number(saved) };
    } else context.cookies.delete('loyalty-preselection', { path: '/' });
    return new Response(JSON.stringify(result), { headers });
  } catch (error) {
    const safe = safeError(error);
    return new Response(JSON.stringify({ error: safe.message }), {
      status:
        safe.kind === 'authentication'
          ? 401
          : safe.kind === 'forbidden'
            ? 403
            : safe.kind === 'validation'
              ? 400
              : 503,
      headers,
    });
  }
};
