import type { APIRoute } from 'astro';
import { boundedBody } from '@market/config';
import { customerApi, customerReturn } from '../../lib/customer-dashboard';
export const POST: APIRoute = async (context) => {
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex, nofollow',
  });
  let returnTo = '/account';
  try {
    if (context.request.headers.get('origin') !== context.url.origin)
      return new Response('Request denied.', { status: 403, headers });
    const form = new URLSearchParams(await boundedBody(context.request, 2048));
    returnTo = customerReturn(form.get('returnTo'));
    const kind = form.get('kind') ?? '',
      id = form.get('id') ?? '',
      state = form.get('following');
    if (
      !['MARKET', 'VENDOR'].includes(kind) ||
      !/^[1-9]\d*$/.test(id) ||
      !['true', 'false'].includes(state ?? '')
    )
      throw new Error('Invalid follow');
    await customerApi(context, headers).follow(kind, id, state === 'true');
    const target = new URL(returnTo, context.url);
    target.searchParams.set('followSaved', '1');
    headers.set('Location', target.pathname + target.search);
  } catch {
    const target = new URL(returnTo, context.url);
    target.searchParams.set('followError', '1');
    headers.set('Location', target.pathname + target.search);
  }
  return new Response(null, { status: 303, headers });
};
