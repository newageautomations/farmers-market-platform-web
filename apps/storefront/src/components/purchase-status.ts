import type { StatusTone } from '@market/ui/presentation';
// Customer purchase projection meanings remain independent of administrative statuses.
const tones: Record<'financial' | 'pickup', Record<string, StatusTone>> = {
  financial: {
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
  },
};
export function purchaseStatusTone(
  domain: keyof typeof tones,
  value: string,
): StatusTone {
  return Object.hasOwn(tones[domain], value)
    ? tones[domain][value]!
    : 'neutral';
}
