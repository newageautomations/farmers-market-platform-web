import type { VendorPreorderOccurrence } from '@market/api';
import { occurrenceLabel } from '@market/storefront-core/market';
import { ShopMarketSelection } from '../ShopMarketSelection';

export function ProductMarketSelector({
  storefrontId,
  occurrences,
  selected,
  unavailable = false,
  preview = false,
}: {
  storefrontId: string;
  occurrences: readonly VendorPreorderOccurrence[];
  selected?: VendorPreorderOccurrence;
  unavailable?: boolean;
  preview?: boolean;
}) {
  return (
    <section className="em-product-market" aria-label="Pickup market">
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 10h16M5 10l1-5h12l1 5M6 10v9h12v-9M9 19v-5h6v5" />
        <path d="M4 10c0 1.4 1 2.5 2.3 2.5S8.7 11.4 8.7 10c0 1.4 1 2.5 2.4 2.5s2.4-1.1 2.4-2.5c0 1.4 1 2.5 2.4 2.5s2.3-1.1 2.3-2.5" />
      </svg>
      <div>
        <p>
          {selected
            ? `Available for pickup at ${selected.marketName}`
            : unavailable
              ? 'Pickup markets are temporarily unavailable'
              : 'Choose a pickup market'}
        </p>
        <span>
          {selected
            ? occurrenceLabel(selected, 'compact')
            : 'View upcoming market dates'}
        </span>
      </div>
      {occurrences.length > 0 && (
        <ShopMarketSelection
          storefrontId={storefrontId}
          occurrences={occurrences}
          selectedId={selected?.id ?? ''}
          preview={preview}
        />
      )}
    </section>
  );
}
