import type { StatusTone } from '@market/ui/presentation';

// Presentation of the existing vendor projections. No state/command authority.
const tones: Record<
  'order' | 'payment' | 'pickup' | 'fulfillment',
  Record<string, StatusTone>
> = {
  order: {
    AddingItems: 'neutral',
    Draft: 'neutral',
    ArrangingPayment: 'warning',
    PaymentAuthorized: 'info',
    PaymentSettled: 'success',
    PartiallyShipped: 'warning',
    Shipped: 'info',
    PartiallyDelivered: 'warning',
    Delivered: 'success',
    Cancelled: 'danger',
    Modifying: 'warning',
    ArrangingAdditionalPayment: 'warning',
  },
  payment: {
    PAID: 'success',
    PARTIALLY_REFUNDED: 'warning',
    REFUNDED: 'info',
    REFUND_REQUIRED: 'danger',
    REFUND_FAILED: 'danger',
  },
  pickup: {
    PENDING: 'warning',
    PARTIAL: 'warning',
    COLLECTED: 'success',
    CANCELLED: 'danger',
    AWAITING_PICKUP: 'warning',
  },
  fulfillment: {
    Pending: 'warning',
    Shipped: 'info',
    Delivered: 'success',
    Cancelled: 'danger',
  },
};
export function vendorOrderStatus(domain: keyof typeof tones, value: string) {
  const mapping = tones[domain];
  const spaced = value.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ');
  return {
    tone: Object.hasOwn(mapping, value) ? mapping[value]! : 'neutral',
    label:
      value === value.toUpperCase()
        ? spaced.charAt(0) + spaced.slice(1).toLowerCase() || 'Unknown'
        : spaced,
  };
}
