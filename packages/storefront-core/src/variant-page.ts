import type { PublicProduct } from '@market/api';

/** Resolve a product-scoped variant URL using only the authorized Shop response. */
export function variantProductPage(
  product: PublicProduct,
  slug: string,
): PublicProduct | null {
  const variant = product.variants.find((v) => v.catalogDetails?.slug === slug);
  if (!variant?.catalogDetails) return null;
  const details = variant.catalogDetails;
  return {
    ...product,
    name: `${product.name} (${variant.name})`,
    description: details.description,
    productInformation: details.productInformation,
    assets: details.assets,
    featuredAsset: details.assets[0] ?? null,
    variants: [variant],
  };
}
