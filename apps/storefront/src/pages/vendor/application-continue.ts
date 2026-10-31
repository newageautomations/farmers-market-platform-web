import type { APIRoute } from 'astro';
import { randomBytes } from 'node:crypto';
import { centralSignIn } from '../../lib/account';
export const GET: APIRoute = async (context) => {
  const p = context.url.searchParams,
    draft = p.get('draft'),
    claim = p.get('claim'),
    vendor = p.get('vendor'),
    channel = p.get('channel'),
    slug = p.get('slug');
  const headers = {
    'Cache-Control': 'private, no-store',
    'Referrer-Policy': 'no-referrer',
  };
  if (
    context.locals.storefront?.kind !== 'MARKET' ||
    (draft && !/^[1-9]\d*$/.test(draft)) ||
    (claim && !/^[1-9]\d*$/.test(claim)) ||
    (!draft && !claim && (!slug || !/^[a-zA-Z0-9-]{1,80}$/.test(slug)))
  )
    return new Response('Application continuation unavailable.', {
      status: 400,
      headers,
    });
  if (claim && !context.cookies.has(`application-claim-${claim}`))
    return context.redirect('/vendor/application-help');
  const returnParams = new URLSearchParams(
    draft ? { draft } : claim ? { claim } : { slug: slug! },
  );
  if (vendor && /^[1-9]\d*$/.test(vendor)) returnParams.set('vendor', vendor);
  const returnTo = '/vendor/application-return?' + returnParams.toString();
  if (!draft)
    return context.redirect(
      await centralSignIn(context, returnTo, 'vendor-applications'),
    );
  const admin = process.env.ADMIN_ORIGIN;
  if (!admin || !vendor || !/^[1-9]\d*$/.test(vendor))
    return new Response(
      'Select the Vendor business in Vendor Applications and resume again.',
      { status: 400, headers },
    );
  const correlation = randomBytes(32).toString('base64url');
  const options = {
    httpOnly: true,
    secure: context.url.protocol === 'https:',
    sameSite: 'lax' as const,
    path: '/auth/callback',
    maxAge: 120,
  };
  context.cookies.set('account-correlation', correlation, options);
  context.cookies.set('account-return', returnTo, options);
  const target = new URL('/vendor/applications/continue', admin);
  for (const [key, value] of Object.entries({
    draft,
    vendor,
    origin: context.url.origin,
    correlation,
  }))
    target.searchParams.set(key, value);
  if (channel && /^[1-9]\d*$/.test(channel))
    target.searchParams.set('channel', channel);
  return context.redirect(target.toString());
};
