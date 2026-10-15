import type { StatusTone } from '@market/ui/presentation';
// Vendor projection labels only. These domains have separate meanings.
const tones: Record<
  'membership' | 'publication' | 'participation' | 'customer',
  Record<string, StatusTone>
> = {
  membership: {
    approved: 'success',
    pending: 'warning',
    suspended: 'danger',
    withdrawn: 'neutral',
  },
  publication: {
    approved: 'success',
    published: 'success',
    PUBLISHED: 'success',
    ELIGIBLE: 'info',
    BLOCKED: 'danger',
    NOT_PUBLISHED: 'neutral',
    pending: 'warning',
    withdrawn: 'neutral',
    blocked: 'danger',
  },
  participation: {
    scheduled: 'info',
    planned: 'warning',
    confirmed: 'success',
    cancelled: 'danger',
  },
  customer: {
    active: 'success',
    ACTIVE: 'success',
    inactive: 'neutral',
    INACTIVE: 'neutral',
  },
};
export function vendorStatusTone(
  domain: keyof typeof tones,
  value: string,
): StatusTone {
  return Object.hasOwn(tones[domain], value)
    ? tones[domain][value]!
    : 'neutral';
}
