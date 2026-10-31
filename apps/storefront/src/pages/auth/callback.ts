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
    let returnTo = safeAccountReturn(
      context.cookies.get('account-return')?.value,
    );
    if (returnTo.startsWith('/vendor/application-return?')) {
      const vendor = context.url.searchParams.get('vendor');
      if (vendor && /^[1-9]\d*$/.test(vendor)) {
        const next = new URL(returnTo, context.url.origin);
        next.searchParams.set('vendor', vendor);
        returnTo = next.pathname + next.search;
      }
    }
    if (!returnTo.startsWith('/vendor/'))
      bindProgressAfterLogin(
        context,
        returnTo,
        result.exchangeCustomerHandoff.principalId,
      );
    context.cookies.delete('account-return', { path: '/auth/callback' });
    headers.set('Location', returnTo);
    return new Response(null, { status: 303, headers });
  } catch {
    headers.set(
      'Location',
      context.cookies.get('account-return')?.value.startsWith('/vendor/')
        ? '/vendor/application-help'
        : '/account/login?retry=1&returnTo=' +
            encodeURIComponent(
              safeAccountReturn(context.cookies.get('account-return')?.value),
            ),
    );
    return new Response(null, { status: 303, headers });
  }
};
