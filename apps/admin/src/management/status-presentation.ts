import type { StatusTone } from '@market/ui/presentation';
// Presentation of management projections, never a readiness/access calculation.
const tones: Record<
  | 'readiness'
  | 'tenant'
  | 'storefront'
  | 'subscription'
  | 'connection'
  | 'mapping'
  | 'catalog',
  Record<string, StatusTone>
> = {
  readiness: {
    READY: 'success',
    CONFIGURED: 'info',
    NOT_CONFIGURED: 'neutral',
    DEGRADED: 'warning',
    UNAVAILABLE: 'danger',
    FAILED: 'danger',
  },
  tenant: { active: 'success', suspended: 'danger' },
  storefront: {
    ACTIVE: 'success',
    PUBLISHED: 'success',
    active: 'success',
    published: 'success',
    DRAFT: 'warning',
    draft: 'warning',
    SUSPENDED: 'danger',
    suspended: 'danger',
  },
  subscription: {
    ACTIVE: 'success',
    TRIALING: 'info',
    PAST_DUE: 'warning',
    CANCELLED: 'neutral',
    EXPIRED: 'neutral',
  },
  connection: {
    CONNECTED: 'success',
    ACTIVE: 'success',
    PENDING: 'warning',
    REAUTHORIZATION_REQUIRED: 'warning',
    RECONCILIATION_REQUIRED: 'warning',
    DISCONNECTED: 'neutral',
    FAILED: 'danger',
  },
  mapping: { CONFIRMED: 'success', PENDING: 'warning', REJECTED: 'danger' },
  catalog: {
    DRAFT: 'warning',
    PUBLISHED: 'success',
    ARCHIVED: 'neutral',
    ACTIVE: 'success',
    INACTIVE: 'neutral',
  },
};
export function managementStatusTone(
  domain: keyof typeof tones,
  value: string,
): StatusTone {
  return Object.hasOwn(tones[domain], value)
    ? tones[domain][value]!
    : 'neutral';
}
