import type { APIContext } from 'astro';
import { AppError, type PublicCatalog } from '@market/api';
import { requestShop } from './shop';

// Share one authorized public catalog read within this request, including the footer.
// Never cache across hosts, visitors or preview requests.
const requests = new WeakMap<Request, Promise<PublicCatalog>>();
export function farmhouseCatalog(
  context: Pick<APIContext, 'locals' | 'request'>,
) {
  let result = requests.get(context.request);
  if (!result) {
    result = load(context);
    requests.set(context.request, result);
  }
  return result;
}
async function load(
  context: Pick<APIContext, 'locals' | 'request'>,
): Promise<PublicCatalog> {
  if (import.meta.env.DEV && context.locals.storefront?.source === 'fixture') {
    const { fixtureCatalog } = await import('@market/storefront-core/fixtures');
    return fixtureCatalog({ skip: 0, take: 100, search: '', sort: 'asc' });
  }
  const api = requestShop(context);
  let items: PublicCatalog['items'] = [];
  for (let skip = 0; skip < 10000; skip += 100) {
    const { products } = await api.catalog({
      options: { skip, take: 100, sort: { id: 'ASC' } },
    });
    items = [...items, ...products.items];
    if (items.length >= products.totalItems)
      return { items, totalItems: products.totalItems };
    if (!products.items.length) break;
  }
  throw new AppError('unavailable');
}
