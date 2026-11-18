import type { APIRoute } from 'astro';
import { boundedBody } from '@market/config';
import {
  customerApi,
  customerAuthenticationError,
} from '../../lib/customer-dashboard';
import { normalizeOverviewLayout } from '../../lib/customer-overview';

/**
 * Saves the signed-in customer's Overview arrangement. Same-origin only; the
 * value is normalized to known sections and valid cells here, and validated
 * again by the backend settings field, which scopes it to the active user.
 */
export const POST: APIRoute = async (context) => {
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    'Content-Type': 'application/json',
  });
  if (context.request.headers.get('origin') !== context.url.origin)
    return new Response('{"error":"denied"}', { status: 403, headers });
  let layout;
  try {
    const body = JSON.parse(await boundedBody(context.request, 4096)) as {
      layout?: unknown;
    };
    if (!body.layout || typeof body.layout !== 'object') throw new Error();
    layout = normalizeOverviewLayout(body.layout as never);
  } catch {
    return new Response('{"error":"invalid"}', { status: 400, headers });
  }
  try {
    await customerApi(context, headers).saveLayout(layout);
    return new Response(JSON.stringify({ layout }), { status: 200, headers });
  } catch (error) {
    return new Response('{"error":"unavailable"}', {
      status: customerAuthenticationError(error) ? 401 : 503,
      headers,
    });
  }
};
