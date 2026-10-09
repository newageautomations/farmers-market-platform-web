import type { APIRoute } from 'astro';
import { createHash } from 'node:crypto';
import { boundedBody } from '@market/config';
import {
  accountBridge,
  accountOrigin,
  isCentral,
  setCentral,
} from '../../lib/account';
import { requestCheckout } from '../../lib/shop';
export const POST: APIRoute = async (context) => {
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Robots-Tag': 'noindex, nofollow',
  });
  try {
    if (context.request.headers.get('origin') !== context.url.origin)
      throw new Error('Denied');
    const data = await boundedBody(context.request);
    if (data.length > 4096) throw new Error('Denied');
    const form = new URLSearchParams(data),
      action = form.get('action');
    let location = '/account';
    if (isCentral(context.url)) {
      switch (action) {
        case 'request': {
          const origin = form.get('origin') ?? '';
          const receipt = await accountBridge<{ deliveryAvailable: boolean }>({
            action: 'request',
            email: form.get('email') ?? '',
            origin,
            boundary: createHash('sha256')
              .update(context.clientAddress)
              .digest('hex'),
          });
          const next = new URL('/account/sign-in', accountOrigin());
          next.searchParams.set('origin', origin);
          next.searchParams.set('requested', '1');
          if (!receipt.deliveryAvailable)
            next.searchParams.set('delivery', 'unavailable');
          location = next.toString();
          break;
        }
        case 'claim': {
          const r = await accountBridge<{ central: string; callback: string }>({
            action: 'claim',
            token: form.get('token') ?? '',
          });
          setCentral(context, r.central);
          // Complete the same-origin form navigation before the deliberate top-level
          // merchant navigation. CSP form-action otherwise also governs cross-origin
          // HTTP redirect chains. The bridge owns and validates this canonical target.
          const target = r.callback.replace(
            /[&<>"']/g,
            (character) =>
              ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
              })[character]!,
          );
          headers.set('Content-Type', 'text/html; charset=utf-8');
          return new Response(
            '<!doctype html><html lang="en"><head><meta name="robots" content="noindex,nofollow"><meta http-equiv="refresh" content="0;url=' +
              target +
              '"><title>Continue to your orders</title></head><body><main><h1>Continue to your orders</h1><a href="' +
              target +
              '">Continue</a></main></body></html>',
            { status: 200, headers },
          );
        }
        case 'logout': {
          const central = context.cookies.get('platform-account')?.value;
          if (central)
            await accountBridge({
              action: 'logout',
              central,
              everywhere: form.get('everywhere') === 'true',
            });
          context.cookies.delete('platform-account', { path: '/' });
          location = '/auth/signed-out';
          break;
        }
        default:
          throw new Error('Denied');
      }
    } else {
      if (action !== 'logout' || !context.locals.storefront)
        throw new Error('Denied');
      await requestCheckout(context, headers).logout();
      // Explicit top-level central logout also ends the remembered central session.
      location = new URL('/auth/logout', accountOrigin()).toString();
    }
    headers.set('Location', location);
    return new Response(null, { status: 303, headers });
  } catch {
    return new Response(
      '<!doctype html><html lang="en"><head><meta name="robots" content="noindex,nofollow"><title>Account link unavailable</title></head><body><main><h1>Account link unavailable</h1><p>This link expired or is unavailable. Request a new one from your Storefront.</p></main></body></html>',
      {
        status: 400,
        headers: {
          ...Object.fromEntries(headers),
          'Content-Type': 'text/html; charset=utf-8',
        },
      },
    );
  }
};
