import type { StorefrontContext } from '@market/storefront-core';
import {
  isWebsiteSectionDestination,
  marketPage,
} from '@market/theme/storefront';

/** Destination safety and page availability are independent of a theme's layout. */
export function websiteSectionDestination(
  context: StorefrontContext,
  href: string,
): boolean {
  if (!isWebsiteSectionDestination(href)) return false;
  if (href === '/' || href.startsWith('/products')) return true;
  // Market website pages follow the market's own page settings.
  const market = (
    {
      '/market-dates': 'market-dates',
      '/vendors': 'vendors',
      '/applications': 'applications',
    } as const
  )[href as '/market-dates' | '/vendors' | '/applications'];
  if (market)
    return (
      context.kind === 'MARKET' &&
      marketPage(context.appearance, market).enabled
    );
  const page = {
    '/about': 'about',
    '/find-us': 'findUs',
    '/contact': 'contact',
    '/faq': 'faq',
    '/policies': 'policies',
  }[href] as 'about' | 'findUs' | 'contact' | 'faq' | 'policies' | undefined;
  return !!(page && context.appearance?.[page]?.enabled);
}
