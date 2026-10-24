import type { CheckoutView } from '@market/api';
import type { VendorPreorderState } from '../lib/vendor-preorder';

/** Compact order facts. Occurrence times describe the market schedule. */
export function CheckoutPickup({
  view,
  preorder,
}: {
  view: CheckoutView;
  preorder?: VendorPreorderState;
}) {
  const occurrence = preorder?.selected ?? preorder?.orderOccurrence;
  const pickup = view.pickupPromise;
  const venue = pickup.venue || occurrence?.venue;
  const startsAt = occurrence?.startsAt || pickup.startsAt;
  const endsAt = occurrence?.endsAt || pickup.endsAt;
  const timeZone = occurrence?.timezone ?? 'UTC';
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
      <h2>Pickup Details</h2>
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
      {venue && (
        <p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {venue}
          </a>
        </p>
      )}
    </section>
  );
}
