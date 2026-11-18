import type { PublicCart } from '@market/api';
import type { VendorPreorderState } from './vendor-preorder';

export function cartLineIssue(
  line: PublicCart['lines'][number],
  preorder: VendorPreorderState,
) {
  if (preorder.unavailable || !preorder.selected)
    return 'Availability is temporarily unavailable for this market.';
  const fact = preorder.availability.find(
    (entry) => entry.variantId === line.productVariant.id,
  );
  if (!fact)
    return 'Availability is temporarily unavailable.';
  if (!fact.available)
    return fact.reason || 'This item is currently unavailable at this market.';
  if (fact.quantity !== null && line.quantity > fact.quantity)
    return `Only ${fact.quantity} are currently available. Reduce the quantity or remove this item.`;
  return '';
}

export function cartCheckoutIssue(
  cart: PublicCart | null,
  preorder: VendorPreorderState,
) {
  if (!cart?.lines.length) return 'Your cart is empty.';
  if (cart.state !== 'AddingItems') return '';
  if (preorder.unavailable || !preorder.selected)
    return 'Your cart’s pickup market is temporarily unavailable.';
  if (cart.lines.some((line) => cartLineIssue(line, preorder)))
    return 'Review the availability messages beside your items before continuing.';
  return '';
}
