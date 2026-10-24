import type { APIContext } from 'astro';
import type {
  VendorPreorderAvailability,
  VendorPreorderOccurrence,
  PublicCart,
  PublicMarketOccurrence,
} from '@market/api';
import { requestShop } from './shop';

export const preorderCookie = (storefrontId: string) =>
  `vendor-occurrence-${storefrontId}`;

export async function vendorPreorder(
  context: APIContext,
  variantIds: string[],
  cart?: PublicCart | null,
) {
  let occurrences: readonly VendorPreorderOccurrence[] = [],
    selected: VendorPreorderOccurrence | undefined,
    availability: VendorPreorderAvailability = [],
    unavailable = false;
  let orderOccurrence: PublicMarketOccurrence | undefined;
  if (context.locals.storefront?.source !== 'backend')
    return {
      occurrences,
      selected,
      availability,
      unavailable,
      orderOccurrence,
    };
  const api = requestShop(context);
  try {
    occurrences = await api.occurrences();
    const requested =
      context.url.searchParams.get('occurrence') ??
      context.cookies.get(
        preorderCookie(context.locals.storefront.storefrontId ?? ''),
      )?.value;
    let hasItems = false;
    if (!context.locals.editorPreview) {
      const current = cart === undefined ? (await api.bootstrap()).cart : cart;
      hasItems = !!current?.lines.length;
      if (hasItems) {
        const marketCart = await api.marketCart();
        if (marketCart?.id === current?.id)
          orderOccurrence = marketCart?.occurrence;
      }
    }
    // A populated order must never fall back to a browser preference, even when
    // its occurrence has disappeared from the eligible public list.
    selected = hasItems
      ? occurrences.find((o) => o.id === orderOccurrence?.id)
      : (occurrences.find((o) => o.id === requested) ?? occurrences[0]);
    if (selected && !context.locals.editorPreview)
      context.cookies.set(
        preorderCookie(context.locals.storefront.storefrontId ?? ''),
        selected.id,
        {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: context.url.protocol === 'https:',
          maxAge: 60 * 60 * 24 * 30,
        },
      );
    if (selected) {
      const ids = [...new Set(variantIds)];
      for (let skip = 0; skip < ids.length; skip += 20)
        availability = [
          ...availability,
          ...(await api.availability(selected.id, ids.slice(skip, skip + 20))),
        ];
    }
  } catch {
    unavailable = true;
    availability = [];
  }
  return { occurrences, selected, availability, unavailable, orderOccurrence };
}

export type VendorPreorderState = Awaited<ReturnType<typeof vendorPreorder>>;
