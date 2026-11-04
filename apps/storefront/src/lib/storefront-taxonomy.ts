import { taxonomyNavigation } from '@market/storefront-core';
import type { APIContext } from 'astro';
import type { VendorStorefrontTaxonomy } from '@market/api';
import { requestShop } from './shop';

const requests = new WeakMap<Request, Promise<VendorStorefrontTaxonomy>>();
/** Complete channel-authorized projection, shared within one SSR request. Never a homepage sample. */
export function vendorTaxonomy(
  context: Pick<APIContext, 'locals' | 'request'>,
) {
  let result = requests.get(context.request);
  if (!result) {
    result =
      context.locals.storefront?.source === 'fixture'
        ? Promise.resolve({
            taxonomy: { categories: [], tags: [] },
            products: [],
            totalProducts: 0,
          })
        : requestShop(context).taxonomy();
    requests.set(context.request, result);
  }
  return result;
}

/** Category decorations may disappear on a read failure without hiding the storefront's content. */
export async function vendorCategoryNavigation(
  context: Pick<APIContext, 'locals' | 'request'>,
) {
  try {
    return taxonomyNavigation(
      (await vendorTaxonomy(context)).taxonomy,
      context.locals.storefront?.appearance?.categoryPresentation,
    );
  } catch {
    return [];
  }
}
