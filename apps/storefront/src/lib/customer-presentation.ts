import type { CustomerEvent, CustomerPurchase } from '@market/api';
import type { StatusTone } from '@market/ui/presentation';
import { purchaseStatusTone } from '../components/purchase-status';

/**
 * Customer dashboard labels and summaries. Presentation only: payment and
 * pickup states come from the backend purchase projection unchanged.
 */
export const financialNames: Record<string, string> = {
  PAID: 'Paid',
  PARTIALLY_REFUNDED: 'Partially refunded',
  REFUNDED: 'Refunded',
  REFUND_REQUIRED: 'Refund required',
  REFUND_FAILED: 'Refund failed',
};
export const pickupNames: Record<string, string> = {
  PENDING: 'Pickup pending',
  COLLECTED: 'Picked up',
  PARTIAL: 'Partially picked up',
  CANCELLED: 'Cancelled',
};
export function financialStatus(purchase: CustomerPurchase) {
  const value = purchase.financial.financialStatus;
  return {
    label: financialNames[value] ?? 'Payment status pending',
    tone: purchaseStatusTone('financial', value),
  };
}
export function pickupStatus(value: string): {
  label: string;
  tone: StatusTone;
} {
  return {
    label: pickupNames[value] ?? 'Pickup status pending',
    tone: purchaseStatusTone('pickup', value),
  };
}
/** One pickup state for the whole purchase, from its vendor portions. */
export function purchasePickup(purchase: CustomerPurchase) {
  const states = purchase.portions.map((portion) => portion.pickupStatus);
  const value = !states.length
    ? ''
    : states.every((s) => s === 'COLLECTED')
      ? 'COLLECTED'
      : states.every((s) => s === 'CANCELLED')
        ? 'CANCELLED'
        : states.some((s) => s === 'PENDING') &&
            !states.some((s) => s === 'COLLECTED' || s === 'PARTIAL')
          ? 'PENDING'
          : states.some((s) => s === 'PENDING' || s === 'PARTIAL')
            ? 'PARTIAL'
            : 'COLLECTED';
  return pickupStatus(value);
}
export function awaitingPickup(purchase: CustomerPurchase) {
  return purchase.portions.some(
    (portion) =>
      portion.pickupStatus === 'PENDING' || portion.pickupStatus === 'PARTIAL',
  );
}
export function purchaseKind(purchase: CustomerPurchase) {
  return purchase.kind === 'DIRECT_VENDOR'
    ? 'Direct vendor purchase'
    : 'Market purchase';
}
export function itemCount(purchase: CustomerPurchase) {
  return purchase.portions.reduce(
    (total, portion) =>
      total + portion.lines.reduce((sum, line) => sum + line.quantity, 0),
    0,
  );
}
export function purchaseVendors(purchase: CustomerPurchase) {
  return [...new Set(purchase.portions.map((p) => p.vendorName))].join(', ');
}
export function purchaseDate(value: string, style: 'short' | 'long' = 'short') {
  return new Date(value).toLocaleDateString('en-US', {
    month: style === 'long' ? 'long' : 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
/** The earliest upcoming pickup among the purchase's pending portions. */
export function nextPickup(purchase: CustomerPurchase, now = Date.now()) {
  return purchase.portions
    .filter(
      (portion) =>
        (portion.pickupStatus === 'PENDING' ||
          portion.pickupStatus === 'PARTIAL') &&
        (portion.pickupPromise.startsAt ?? portion.occurrenceStartsAt),
    )
    .map((portion) => ({
      portion,
      startsAt: (portion.pickupPromise.startsAt ??
        portion.occurrenceStartsAt) as string,
    }))
    .filter((pickup) => Date.parse(pickup.startsAt) >= now - 12 * 3600_000)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];
}
export function shortEventDate(
  event: Pick<CustomerEvent, 'startsAt' | 'timezone'>,
) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: event.timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(event.startsAt));
}
export function eventTimeRange(
  event: Pick<CustomerEvent, 'startsAt' | 'endsAt' | 'timezone'>,
  zone = true,
) {
  const format = new Intl.DateTimeFormat('en-US', {
    timeZone: event.timezone,
    hour: 'numeric',
    minute: '2-digit',
  });
  const suffix = zone
    ? ' ' +
      (new Intl.DateTimeFormat('en-US', {
        timeZone: event.timezone,
        timeZoneName: 'short',
      })
        .formatToParts(new Date(event.startsAt))
        .find((part) => part.type === 'timeZoneName')?.value ?? '')
    : '';
  return `${format.format(new Date(event.startsAt))} to ${format.format(new Date(event.endsAt))}${suffix}`.trim();
}
/** Calendar tile parts in the event's own timezone. */
export function eventTile(event: Pick<CustomerEvent, 'startsAt' | 'timezone'>) {
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: event.timezone,
      ...options,
    }).format(new Date(event.startsAt));
  return {
    month: part({ month: 'short' }).toUpperCase(),
    day: part({ day: 'numeric' }),
    weekday: part({ weekday: 'long' }).toUpperCase(),
  };
}
/** Calendar-day key in a timezone, so server and browser agree. */
function dayKey(value: number, timeZone: string) {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date(value))
    .split('-')
    .map(Number);
  return Date.UTC(y!, m! - 1, d!);
}
/** Today, Tomorrow or In N days, counted in the given timezone. */
export function relativeDays(
  startsAt: string,
  now = Date.now(),
  timeZone = 'UTC',
) {
  const days = Math.round(
    (dayKey(Date.parse(startsAt), timeZone) - dayKey(now, timeZone)) /
      86_400_000,
  );
  return days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
}
/** Long event date in the event's own timezone (client-safe). */
export function longEventDate(
  event: Pick<CustomerEvent, 'startsAt' | 'timezone'>,
) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: event.timezone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(event.startsAt));
}
/** Short weekday date in a timezone. */
export function shortDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}
export function plural(count: number, word: string, many = `${word}s`) {
  return `${count} ${count === 1 ? word : many}`;
}
