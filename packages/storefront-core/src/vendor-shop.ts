import type { PublicCatalog, VendorPreorderAvailability } from '@market/api';
import { isOutOfStock, lowStock, lowStockLabel } from './stock';

/** Input is the channel-authorized public catalog, never an Admin catalog. */
export function relatedProducts(
  current: PublicCatalog['items'][number],
  catalog: PublicCatalog['items'],
  excludedSlugs: readonly string[] = [],
) {
  const categories = new Set(shopCategories([current]).map((c) => c.id));
  return catalog
    .filter((p) => p.id !== current.id && !excludedSlugs.includes(p.slug))
    .sort(
      (a, b) =>
        Number(b.facetValues.some((v) => categories.has(v.id))) -
        Number(a.facetValues.some((v) => categories.has(v.id))),
    )
    .slice(0, 4);
}

/** Reuses the product-detail ranking while excluding every product in the cart. */
export function cartRelatedProducts(
  slugs: readonly string[],
  catalog: PublicCatalog['items'],
) {
  const current = catalog.find((product) => slugs.includes(product.slug));
  return current
    ? relatedProducts(current, catalog, slugs)
    : catalog.slice(0, 4);
}

export function shopCategories(items: PublicCatalog['items']) {
  const categories = new Map<string, { id: string; name: string }>();
  for (const product of items)
    for (const value of product.facetValues)
      if (value.facet.code === 'farmstand-category')
        categories.set(value.id, { id: value.id, name: value.name });
  return [...categories.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function shopProducts(
  items: PublicCatalog['items'],
  category: string,
  sort: string,
) {
  const result = items.filter(
    (p) =>
      !category ||
      p.facetValues.some(
        (v) => v.id === category && v.facet.code === 'farmstand-category',
      ),
  );
  return result.sort((a, b) => {
    const stable = Number(a.id) - Number(b.id);
    if (sort === 'name') return a.name.localeCompare(b.name) || stable;
    return stable;
  });
}

export function productPreorder(
  variants: PublicCatalog['items'][number]['variants'],
  availability: VendorPreorderAvailability,
) {
  const fact = (id: string) => availability.find((a) => a.variantId === id);
  const eligible = variants.filter((v) => fact(v.id)?.available);
  // Multiple product variants always require the existing explicit option workflow.
  const variantId =
    variants.length === 1 && eligible.length === 1
      ? eligible[0]!.id
      : undefined;
  const outOfStock =
    !eligible.length &&
    variants.length > 0 &&
    variants.every((v) => isOutOfStock(fact(v.id)));
  const remaining = variantId ? lowStock(fact(variantId)) : null;
  return {
    available: eligible.length > 0,
    variantId,
    outOfStock,
    lowStock: remaining,
    reason: eligible.length
      ? remaining != null
        ? lowStockLabel(remaining)
        : 'Available at this market'
      : outOfStock
        ? 'Out of stock'
        : (variants.map((v) => fact(v.id)?.reason).find(Boolean) ??
          'Availability could not be confirmed'),
  };
}
