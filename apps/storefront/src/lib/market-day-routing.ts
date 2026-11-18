import type { StorefrontContext } from '@market/storefront-core';

/** The alternate landing view never owns commerce, account or editor routes. */
export function marketDayLandingAllowed(
  context: Pick<StorefrontContext, 'kind' | 'source'> | undefined,
  editorPreview: boolean,
  url: URL,
) {
  return (
    url.pathname === '/' &&
    context?.kind === 'MARKET' &&
    context.source === 'backend' &&
    !editorPreview &&
    url.searchParams.get('storefront') !== 'regular'
  );
}
