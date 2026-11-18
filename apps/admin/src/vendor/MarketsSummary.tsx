import type { ComponentProps } from 'react';
import { MarketsSummary as SharedMarketsSummary } from '@market/ui/workspace';
import { SummaryCarouselDots, useSummaryCarousel } from '../market/mobile';

/**
 * Admin entry point for the shared `@market/ui/workspace` summary (moved there
 * so the customer dashboard shares it). In the Vendor dashboard the cards
 * become a sideways carousel on a phone (`vendor-mobile.css`), with position
 * dots added as the summary's next sibling; every other role renders the
 * shared summary unchanged.
 */
export function MarketsSummary(
  props: ComponentProps<typeof SharedMarketsSummary>,
) {
  const carousel = useSummaryCarousel();
  if (!carousel || props.items.length < 2)
    return <SharedMarketsSummary {...props} />;
  return (
    <>
      <SharedMarketsSummary {...props} />
      <SummaryCarouselDots count={props.items.length} />
    </>
  );
}
