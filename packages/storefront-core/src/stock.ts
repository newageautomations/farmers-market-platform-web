import type { VendorPreorderAvailability } from '@market/api';

// Client-safe: islands import this through '@market/storefront-core/stock', because the
// package root also exports server-only request helpers.
type StockFact = VendorPreorderAvailability[number];

/** Remaining quantities at or below this show a "N left in stock" warning. */
export const LOW_STOCK_THRESHOLD = 5;
// Capacity reasons that mean "nothing left", as opposed to ineligible or unconfirmed.
const STOCK_OUT_REASONS = new Set(['Out of stock', 'Sold out for this market']);

export const isOutOfStock = (fact: StockFact | undefined) =>
  !!fact && !fact.available && STOCK_OUT_REASONS.has(fact.reason);

/** The remaining quantity when it is low enough to warn about, otherwise null. */
export function lowStock(fact: StockFact | undefined) {
  const quantity = fact?.available ? fact.quantity : null;
  return quantity != null && quantity >= 1 && quantity <= LOW_STOCK_THRESHOLD
    ? quantity
    : null;
}

export const lowStockLabel = (quantity: number) => `${quantity} left in stock`;

/** Customer-facing explanation for a rejected add, or null when stock is not the cause. */
export function stockMessage(fact: StockFact | undefined, requested = 1) {
  if (isOutOfStock(fact)) return 'This item is out of stock.';
  if (fact?.available && fact.quantity != null && requested > fact.quantity)
    return `Only ${fact.quantity} left in stock. Reduce the quantity and try again.`;
  return null;
}
