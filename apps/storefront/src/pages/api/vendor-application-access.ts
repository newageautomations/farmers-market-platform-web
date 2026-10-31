import type { APIRoute } from 'astro';
import { boundedBody } from '@market/config';
import {
  accountBridge,
  authorizeUnifiedAccount,
  isCentral,
  setUnifiedCentral,
} from '../../lib/account';
export const POST: APIRoute = async (context) => {
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'Referrer-Policy': 'no-referrer',
  });
  try {
    if (
      !isCentral(context.url) ||
      context.request.headers.get('origin') !== context.url.origin
    )
      throw new Error();
    const vendorId = Number(
      new URLSearchParams(await boundedBody(context.request, 2048)).get(
        'vendorId',
      ),
    );
    if (!Number.isSafeInteger(vendorId) || vendorId <= 0) throw new Error();
    const raw = context.cookies.get('vendor-application-continuation')?.value;
    if (!raw) throw new Error();
    const pending = JSON.parse(raw),
      central = context.cookies.get('platform-unified-account')?.value ?? '';
    await accountBridge({
      action: 'applicantApplications',
      central,
      input: { vendorId },
    });
    const result = await authorizeUnifiedAccount(
      central,
      pending.origin,
      pending.correlation,
    );
    setUnifiedCentral(context, result.central);
    context.cookies.delete('vendor-application-continuation', { path: '/' });
    const callback = new URL(result.callback);
    callback.searchParams.set('vendor', String(vendorId));
    headers.set('Location', callback.toString());
    return new Response(null, { status: 303, headers });
  } catch {
    return new Response(
      'Vendor access could not be confirmed. Return to the market invitation and select an authorized Vendor business.',
      { status: 403, headers },
    );
  }
};
