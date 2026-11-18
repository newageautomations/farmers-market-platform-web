import type { APIContext } from 'astro';
import type { PublicCatalog } from '@market/api';
import { requestShop } from './shop';
import {
  vendorTaxonomy,
  vendorCategoryNavigation,
} from './storefront-taxonomy';

/** Resolve references against this request's complete vendor projection before reading commerce data. */
export async function harvestShowcaseProducts(
  context: Pick<APIContext, 'locals' | 'request'>,
  ids: readonly string[],
): Promise<PublicCatalog['items']> {
  if (!ids.length || context.locals.storefront?.source !== 'backend') return [];
  try {
    const projection = await vendorTaxonomy(context);
    const owned = new Set(projection.products.map((p) => p.productId));
    const selected = ids.filter((id) => owned.has(id)).slice(0, 8);
    if (!selected.length) return [];
    const { products } = await requestShop(context).catalog({
      options: { take: 8, filter: { id: { in: selected } } },
    });
    const byId = new Map(
      products.items.filter((p) => owned.has(p.id)).map((p) => [p.id, p]),
    );
    return selected.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  } catch {
    return [];
  }
}
export async function harvestShowcaseCategories(
  context: Pick<APIContext, 'locals' | 'request'>,
  ids: readonly string[],
) {
  if (!ids.length) return [];
  const available = new Map(
    (await vendorCategoryNavigation(context)).map((c) => [c.id, c]),
  );
  return ids
    .slice(0, 8)
    .flatMap((id) => (available.has(id) ? [available.get(id)!] : []));
}
