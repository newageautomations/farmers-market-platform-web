import type { APIRoute } from 'astro';
import { requestShop } from '../../lib/shop';

/** Public, host/channel-scoped suggestions. No Admin data or mutable commerce state. */
export const GET: APIRoute = async (context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-store',
  };
  const storefront = context.locals.storefront;
  if (storefront?.kind !== 'VENDOR')
    return new Response(JSON.stringify({ items: [] }), {
      status: 404,
      headers,
    });
  const query = (context.url.searchParams.get('q') ?? '').trim().slice(0, 100);
  if (!query) return new Response(JSON.stringify({ items: [] }), { headers });
  try {
    const products =
      import.meta.env.DEV && storefront.source === 'fixture'
        ? (await import('@market/storefront-core/fixtures')).fixtureCatalog({
            search: query,
            skip: 0,
            take: 8,
            sort: 'asc',
          })
        : (
            await requestShop(context).catalog({
              options: {
                skip: 0,
                take: 8,
                sort: { name: 'ASC' },
                // Vendure's PostgreSQL contains operator uses ILIKE. Escape SQL wildcards
                // so entered letters, percent signs and underscores are literal substrings.
                filter: {
                  name: { contains: query.replace(/[\\%_]/g, '\\$&') },
                },
              },
            })
          ).products;
    const items = products.items
      .filter((product) =>
        product.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
      )
      .slice(0, 8)
      .map((product) => ({
        name: product.name,
        href: '/products/' + encodeURIComponent(product.slug),
      }));
    return new Response(JSON.stringify({ items }), { headers });
  } catch {
    return new Response(JSON.stringify({ items: [] }), {
      status: 503,
      headers,
    });
  }
};
