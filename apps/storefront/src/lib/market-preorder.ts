import type { APIContext } from 'astro';
import {
  AppError,
  type MarketBootstrap,
  type PublicMarketOccurrence,
} from '@market/api';
import { requestMarketShop } from './shop';
import { preorderCookie, type VendorPreorderState } from './vendor-preorder';

/** Market dates feed the same Harvest banner/calendar as the vendor shop. */
export async function marketPreorder(
  context: APIContext,
): Promise<VendorPreorderState> {
  const storefront = context.locals.storefront;
  if (storefront?.kind !== 'MARKET' || storefront.source !== 'backend')
    throw new AppError('not-found');
  const api = requestMarketShop(context);
  let dates: readonly PublicMarketOccurrence[] = [];
  for (let skip = 0; ; skip += 50) {
    const page = (await api.occurrences({ options: { skip, take: 50 } }))
      .marketStorefrontOccurrences;
    dates = [...dates, ...page.items];
    if (dates.length >= page.totalItems) break;
    if (!page.items.length || skip >= 9900) throw new AppError('unavailable');
  }
  let bootstrap: MarketBootstrap = { signedIn: false, cart: null };
  if (!context.locals.editorPreview) bootstrap = await api.bootstrap();
  const occurrences = dates.map((date) => ({
    ...date,
    marketId: storefront.subjectId!,
    marketName: storefront.name,
  }));
  const requested = context.url.searchParams.get('occurrence');
  if (requested && !occurrences.some((date) => date.id === requested))
    throw new AppError('not-found');
  const orderOccurrence = bootstrap.cart?.totalQuantity
    ? bootstrap.cart.occurrence
    : undefined;
  const preferred =
    requested ??
    orderOccurrence?.id ??
    context.cookies.get(preorderCookie(storefront.storefrontId ?? ''))?.value;
  const selected = occurrences.find((date) => date.id === preferred);
  // Remember the chosen date so the header and homepage categories follow it.
  if (selected && !context.locals.editorPreview)
    context.cookies.set(
      preorderCookie(storefront.storefrontId ?? ''),
      selected.id,
      {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: context.url.protocol === 'https:',
        maxAge: 60 * 60 * 24 * 30,
      },
    );
  return {
    occurrences,
    selected,
    availability: [],
    unavailable: false,
    orderOccurrence,
  };
}
