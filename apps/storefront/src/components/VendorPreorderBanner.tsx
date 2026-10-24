import type { VendorPreorderState } from '../lib/vendor-preorder';
import { occurrenceLabel } from '@market/storefront-core/market';
import { ShopMarketSelection } from './ShopMarketSelection';

/** Shared feature composition of the existing market banner and protected picker. */
export function VendorPreorderBanner({
  storefrontId,
  preorder,
  preview = false,
  hasItems = false,
  disabled = false,
  scheduleFormat = 'full',
  onBusyChange,
}: {
  storefrontId: string;
  preorder: Pick<
    VendorPreorderState,
    'selected' | 'occurrences' | 'unavailable'
  > &
    Partial<Pick<VendorPreorderState, 'orderOccurrence'>>;
  preview?: boolean;
  hasItems?: boolean;
  disabled?: boolean;
  scheduleFormat?: 'full' | 'compact';
  onBusyChange?: (busy: boolean) => void;
}) {
  const { selected, orderOccurrence } = preorder;
  const occurrence = selected ?? orderOccurrence;
  return (
    <div className="shop-market-banner">
      <div>
        <h2 className="ui-section-title-consumer">
          {selected
            ? `Preordering for ${selected.marketName}`
            : preorder.unavailable
              ? 'Market availability is temporarily unavailable'
              : hasItems || orderOccurrence
                ? 'Your cart’s pickup market cannot be confirmed'
                : 'No upcoming pickup markets'}
        </h2>
        <p>
          {occurrence
            ? `${scheduleFormat === 'full' ? 'Market hours: ' : ''}${occurrenceLabel(occurrence, scheduleFormat)} · ${occurrence.venue}`
            : 'Choose an eligible market before preordering. Please check back if no dates are available.'}
        </p>
        <p>
          {selected?.pickupInstructions ||
            'Preorders are collected at the market. Pickup details are confirmed during checkout.'}
        </p>
        {!selected && (hasItems || orderOccurrence) && (
          <p>Remove the current items before choosing another market.</p>
        )}
      </div>
      {preorder.occurrences.length > 0 && (
        <ShopMarketSelection
          key={selected?.id ?? ''}
          storefrontId={storefrontId}
          occurrences={preorder.occurrences}
          selectedId={selected?.id ?? ''}
          preview={preview}
          disabled={disabled}
          onBusyChange={onBusyChange}
        />
      )}
    </div>
  );
}
