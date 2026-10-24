import type { PublicCart } from '@market/api';
import type { VendorPreorderState } from './vendor-preorder';

export function cartLineIssue(
  line: PublicCart['lines'][number],
  preorder: VendorPreorderState,
) {
  if (preorder.unavailable || !preorder.selected)
    return 'Availability cannot be confirmed for this cart’s market. You can remove this item or refresh to try again.';
  const fact = preorder.availability.find(
    (entry) => entry.variantId === line.productVariant.id,
  );
  if (!fact)
    return 'Availability could not be confirmed. Refresh before checking out.';
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
  if (cart.state !== 'AddingItems')
    return 'This order cannot continue from the cart in its current state. Refresh to check its status.';
  if (preorder.unavailable || !preorder.selected)
    return 'Your cart’s pickup market cannot be confirmed. Refresh or remove the items before choosing another market.';
  if (cart.lines.some((line) => cartLineIssue(line, preorder)))
    return 'Review the availability messages beside your items before continuing.';
  return '';
}
