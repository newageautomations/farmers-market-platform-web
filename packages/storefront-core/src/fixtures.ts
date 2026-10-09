import type { StorefrontContext } from './index';
import type { PublicCatalog, PublicProduct } from '@market/api';
const market: StorefrontContext = {
  name: 'Bulverde Market Day',
  kind: 'MARKET',
  canonicalOrigin: 'http://market.localhost:4321',
  source: 'fixture',
  template: 'community',
  theme: {
    primary: '#315947',
    secondary: '#365349',
    accent: '#C38B46',
    background: '#F8F5EB',
    surface: '#FFFFFF',
    foreground: '#263C30',
    muted: '#566358',
    headingFont: 'serif',
    bodyFont: 'sans',
    logo: '/assets/market-mark.svg',
    favicon: '/assets/market-mark.svg',
  },
};
const vendor: StorefrontContext = {
  name: 'Synthetic Vendor Fixture',
  kind: 'VENDOR',
  canonicalOrigin: 'http://vendor.localhost:4321',
  source: 'fixture',
  template: 'modern',
  theme: {
    primary: '#244967',
    secondary: '#314860',
    accent: '#AF8053',
    background: '#F1F5F8',
    surface: '#FFFFFF',
    foreground: '#26394A',
    muted: '#526679',
    headingFont: 'sans',
    bodyFont: 'sans',
    logo: '/assets/vendor-mark.svg',
    favicon: '/assets/vendor-mark.svg',
  },
};
export function resolveFixture(hostname: string) {
  // Fresh object per request. No process-global current tenant or mutable theme state.
  if (['localhost', '127.0.0.1', 'market.localhost'].includes(hostname))
    return structuredClone(market);
  if (hostname === 'vendor.localhost') return structuredClone(vendor);
  return null;
}
const products: PublicProduct[] = Array.from({ length: 15 }, (_, index) => ({
  id: String(index + 1),
  name:
    index === 0 ? 'Synthetic Harvest Box' : `Synthetic Produce ${index + 1}`,
  slug: `synthetic-produce-${index + 1}`,
  description: 'Synthetic development catalog item.',
  featuredAsset:
    index === 0
      ? { id: '1', preview: '/assets/vendor-mark.svg', width: 640, height: 480 }
      : null,
  assets: [],
  facetValues: [
    {
      id: '1',
      name: index % 2 ? 'Orchard' : 'Garden',
      facet: { id: '1', name: 'Category' },
    },
  ],
  optionGroups: [
    {
      id: '1',
      name: 'Size',
      options: [
        { id: '1', name: 'Standard' },
        { id: '2', name: 'Large' },
      ],
    },
  ],
  variants: [
    {
      id: String(index * 2 + 1),
      name: 'Standard',
      sku: `SYN-${index}-S`,
      priceWithTax: 1000 + index * 100,
      currencyCode: 'USD',
      options: [{ id: '1', name: 'Standard', groupId: '1' }],
    },
    {
      id: String(index * 2 + 2),
      name: 'Large',
      sku: `SYN-${index}-L`,
      priceWithTax: 1500 + index * 100,
      currencyCode: 'USD',
      options: [{ id: '2', name: 'Large', groupId: '1' }],
    },
  ],
}));
export function fixtureProduct(slug: string): PublicProduct | null {
  return structuredClone(products.find((p) => p.slug === slug) ?? null);
}
export function fixtureCatalog(input: {
  skip: number;
  take: number;
  search: string;
  sort: string;
}): PublicCatalog {
  const matching = products
    .filter((p) => p.name.toLowerCase().includes(input.search.toLowerCase()))
    .sort(
      (a, b) => a.name.localeCompare(b.name) * (input.sort === 'desc' ? -1 : 1),
    );
  return {
    totalItems: matching.length,
    items: structuredClone(matching.slice(input.skip, input.skip + input.take)),
  };
}
