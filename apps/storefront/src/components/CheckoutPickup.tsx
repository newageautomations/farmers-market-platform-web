import type { CheckoutView } from '@market/api';
import { formatMoney } from '@market/config';
import type { VendorPreorderState } from '../lib/vendor-preorder';

/** Compact order facts. Occurrence times describe the market schedule. */
export function CheckoutPickup({
  view,
  preorder,
  compact = false,
  timezone,
  showSelections = false,
}: {
  view: CheckoutView;
  preorder?: VendorPreorderState;
  compact?: boolean;
  timezone?: string;
  showSelections?: boolean;
}) {
  const occurrence = preorder?.selected ?? preorder?.orderOccurrence;
  const pickup = view.pickupPromise;
  const venue = pickup.venue || occurrence?.venue;
  const startsAt = occurrence?.startsAt || pickup.startsAt;
  const endsAt = occurrence?.endsAt || pickup.endsAt;
  const timeZone = occurrence?.timezone ?? timezone;
  const instructions =
    pickup.instructions || preorder?.selected?.pickupInstructions;
  const time = (value: string) =>
    new Date(value).toLocaleTimeString('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
    });
  return (
    <section
      className="checkout-section checkout-pickup"
      aria-label="Pickup details"
    >
      {!compact && <h2>Pickup details</h2>}
      {preorder?.selected?.marketName && (
        <strong>{preorder.selected.marketName}</strong>
      )}
      {startsAt && (
        <p>
          Date:{' '}
          {new Date(startsAt).toLocaleDateString('en-US', {
            timeZone,
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      )}
      {startsAt && endsAt && (
        <p>
          Time: {time(startsAt)} to {time(endsAt)}
        </p>
      )}
      {venue && <p>{venue}</p>}
      {instructions && <p>{instructions}</p>}
      {showSelections && <CheckoutPickupSelections view={view} />}
      {venue && (
        <p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get directions
          </a>
        </p>
      )}
    </section>
  );
}

export function CheckoutPickupSelections({ view }: { view: CheckoutView }) {
  if (!view.groups.some((group) => group.pickup.length)) return null;
  return (
    <ul aria-label="Selected pickup options">
      {view.groups.flatMap((group) =>
        group.pickup.map((option, index) => (
          <li key={`${group.vendorId}-${option.methodId ?? index}`}>
            <strong>{group.vendorName}</strong>
            {' · '}
            {option.name}
            {option.fee !== 0 && ` · ${formatMoney(option.fee, view.currency)}`}
            {option.instructions && <p>{option.instructions}</p>}
          </li>
        )),
      )}
    </ul>
  );
}
