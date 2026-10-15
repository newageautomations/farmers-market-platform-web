import type { APIRoute } from 'astro';
import { requestCheckout } from '../../lib/shop';
import { safeAccountReturn } from '../../lib/account';
import { bindProgressAfterLogin } from '../../lib/application-progress';
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
    const result = await requestCheckout(context, headers).handoff(
      code,
      context.locals.storefront.canonicalOrigin,
      correlation,
    );
    context.cookies.delete('account-correlation', { path: '/auth/callback' });
    const returnTo = safeAccountReturn(
      context.cookies.get('account-return')?.value,
    );
    bindProgressAfterLogin(
      context,
      returnTo,
      result.exchangeCustomerHandoff.principalId,
    );
    context.cookies.delete('account-return', { path: '/auth/callback' });
    headers.set('Location', returnTo);
    return new Response(null, { status: 303, headers });
  } catch {
    headers.set('Location', '/account/sign-in?retry=1');
    return new Response(null, { status: 303, headers });
  }
};
