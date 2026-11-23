import type {
  MarketItem,
  PublicProduct,
  VendorPreorderAvailability,
  MarketCatalog,
  MarketCatalogOptions,
} from '@market/api';
import { AppError } from '@market/api';

/** Explicit filter links take precedence; legacy vendor-card links select vendors. */
export function marketShopQuery(params: URLSearchParams): URLSearchParams {
  const query = new URLSearchParams(params);
  const requested = query.get('filter');
  const mode =
    requested === 'vendor' || (requested !== 'category' && query.has('vendor'))
      ? 'vendor'
      : 'category';
  query.set('filter', mode);
  query.delete(mode === 'vendor' ? 'category' : 'vendor');
  return query;
}

/** The public API orders NAME_* by variant name. Sort full product results before paging. */
export async function marketShopCatalog(
  read: (options: MarketCatalogOptions) => Promise<MarketCatalog>,
  options: MarketCatalogOptions,
): Promise<MarketCatalog> {
  if (options.sort === 'PRICE_ASC' || options.sort === 'PRICE_DESC')
    return read(options);
  const catalog = await read({
    ...options,
    distinctProducts: true,
    skip: 0,
    take: 100,
  });
  const items = [...catalog.items];
  while (items.length < catalog.totalItems) {
    if (!items.length || items.length >= 10000)
      throw new AppError('unavailable');
    const next = await read({
      ...options,
      distinctProducts: true,
      skip: items.length,
      take: 100,
    });
    if (!next.items.length || next.totalItems !== catalog.totalItems)
      throw new AppError('unavailable');
    items.push(...next.items);
  }
  const direction = options.sort === 'NAME_DESC' ? -1 : 1;
  items.sort(
    (a, b) =>
      direction *
        a.productName.localeCompare(b.productName, 'en', {
          sensitivity: 'base',
          numeric: true,
        }) || a.productId.localeCompare(b.productId, 'en', { numeric: true }),
  );
  const skip = options.skip ?? 0;
  return { ...catalog, items: items.slice(skip, skip + (options.take ?? 20)) };
}

/** Adapt public market facts to Harvest presentation, without a vendor session. */
export function marketProduct(item: MarketItem): PublicProduct {
  const variants = item.productVariants.length
    ? item.productVariants
    : [
        {
          variantId: item.variantId,
          name: item.name,
          price: item.price,
          currencyCode: item.currencyCode,
        },
      ];
  return {
    id: item.productId,
    name: item.productName,
    slug: item.variantId,
    description: item.description,
    productInformation: '',
    featuredAsset: item.featuredAsset,
    assets: item.featuredAsset ? [item.featuredAsset] : [],
    facetValues: [],
    optionGroups: [],
    variants: variants.map((variant) => ({
      id: variant.variantId,
      name: variant.name,
      sku: '',
      priceWithTax: variant.price,
      currencyCode: variant.currencyCode,
      assets: [],
      featuredAsset: null,
      options: [],
    })),
  };
}

/** Catalog eligibility is public; stock and quantities are validated on add. */
export function marketCatalogAvailability(
  items: readonly MarketItem[],
  variantIds = items.flatMap((item) =>
    marketProduct(item).variants.map((v) => v.id),
  ),
): VendorPreorderAvailability {
  const eligible = new Set(
    items.flatMap((item) => marketProduct(item).variants.map((v) => v.id)),
  );
  return [...new Set(variantIds)].map((variantId) => ({
    variantId,
    available: eligible.has(variantId),
    reason: eligible.has(variantId)
      ? 'Available at this market'
      : 'Unavailable at this market',
    quantity: null,
  }));
}

export const marketProductLink = (variantId: string, occurrenceId?: string) =>
  `/shop/products/${encodeURIComponent(variantId)}${occurrenceId ? `?occurrence=${encodeURIComponent(occurrenceId)}` : ''}`;
