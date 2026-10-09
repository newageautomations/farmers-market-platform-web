import type { APIRoute } from 'astro';
import { requestCheckout } from '../../lib/shop';
export const GET: APIRoute = async (context) => {
  const headers = new Headers();
  headers.set('Cache-Control', 'private, no-store');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  const code = context.url.searchParams.get('code'),
    correlation = context.cookies.get('account-correlation')?.value;
  try {
    if (
      !context.locals.storefront ||
      !code ||
      !correlation ||
      !/^[A-Za-z0-9_-]{43}$/.test(code)
    )
      throw new Error('Invalid capability');
    await requestCheckout(context, headers).handoff(
      code,
      context.locals.storefront.canonicalOrigin,
      correlation,
    );
    context.cookies.delete('account-correlation', { path: '/auth/callback' });
    headers.set('Location', '/account');
    return new Response(null, { status: 303, headers });
  } catch {
    headers.set('Location', '/account/sign-in?retry=1');
    return new Response(null, { status: 303, headers });
  }
};
