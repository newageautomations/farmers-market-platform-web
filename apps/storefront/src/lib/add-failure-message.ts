import { cartMessage, type VendorPreorderAvailability } from '@market/api';
import { stockMessage } from '@market/storefront-core/stock';
import { shopCall } from '../components/shop-client';

// Add rejections that can mean the variant ran out between page load and the add.
const STOCK_CODES = new Set([
  'PREORDER_UNAVAILABLE',
  'ORDER_INTERCEPTOR_ERROR',
  'INSUFFICIENT_STOCK_ERROR',
]);

/**
 * Explains a rejected add in stock terms when a fresh availability read shows stock
 * caused it, and otherwise keeps the shared cart message.
 */
export async function addFailureMessage(
  error: { code?: string; kind?: string },
  add: {
    storefrontId: string;
    occurrenceId?: string;
    variantId: string;
    quantity: number;
  },
) {
  if (add.occurrenceId && STOCK_CODES.has(error.code ?? '')) {
    try {
      const facts = await shopCall<VendorPreorderAvailability>(
        add.storefrontId,
        'product-availability',
        { occurrenceId: add.occurrenceId, variantIds: [add.variantId] },
      );
      const message = stockMessage(
        facts.find((fact) => fact.variantId === add.variantId),
        add.quantity,
      );
      if (message) return message;
    } catch {
      /* The shared cart message still explains the rejection. */
    }
  }
  return cartMessage(error);
}
