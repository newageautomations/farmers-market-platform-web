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
  headingStyle = 'preorder',
  selectionRequired = false,
  concise = false,
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
  headingStyle?: 'preorder' | 'pickup';
  selectionRequired?: boolean;
  /** Omit the general preordering guidance; market-specific details stay. */
  concise?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { selected, orderOccurrence } = preorder;
  const occurrence = selected ?? orderOccurrence;
  // Presentation hook: themes may fold the plain "choose a date" prompt into
  // their own invitation, but never an unavailable, conflict or empty state.
  const state = selected
    ? 'selected'
    : preorder.unavailable
      ? 'unavailable'
      : hasItems || orderOccurrence
        ? 'conflict'
        : selectionRequired && preorder.occurrences.length > 0
          ? 'choose'
          : 'none';
  return (
    <div className="shop-market-banner" data-banner-state={state}>
      <div>
        <h2 className="ui-section-title-consumer">
          {selected
            ? headingStyle === 'pickup'
              ? `Pickup at ${selected.marketName}`
              : `Preordering for ${selected.marketName}`
            : preorder.unavailable
              ? 'Market availability is temporarily unavailable'
              : hasItems || orderOccurrence
                ? 'Your cart’s pickup market cannot be confirmed'
                : selectionRequired && preorder.occurrences.length > 0
                  ? 'Choose a market date'
                  : 'No upcoming pickup markets'}
        </h2>
        {(occurrence || !concise) && (
          <p>
            {occurrence
              ? `${scheduleFormat === 'full' && !concise ? 'Market hours: ' : ''}${occurrenceLabel(occurrence, scheduleFormat)} · ${occurrence.venue}`
              : 'Choose an eligible market before preordering. Please check back if no dates are available.'}
          </p>
        )}
        {(selected?.pickupInstructions || !concise) && (
          <p>
            {selected?.pickupInstructions ||
              'Preorders are collected at the market. Pickup details are confirmed during checkout.'}
          </p>
        )}
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
