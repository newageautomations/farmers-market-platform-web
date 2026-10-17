import type { StatusTone } from './presentation';

/** Documents domain meanings shared by dashboard and application adapters. */
export function documentStatusTone(value: string): StatusTone {
  if (
    [
      'Ready',
      'Complete',
      'Available',
      'Approved',
      'Acknowledged',
      'Valid',
      'No Expiration',
    ].includes(value)
  )
    return 'success';
  if (
    [
      'Incomplete',
      'Not Cleared',
      'Not yet valid',
      'Outstanding',
      'Missing',
      'Expired',
      'Rejected',
      'Scan Failed',
      'Access revoked',
    ].includes(value)
  )
    return 'danger';
  if (
    [
      'Pending review',
      'Pending Review',
      'Expiring Soon',
      'Scanning',
      'Incomplete view',
    ].includes(value)
  )
    return 'warning';
  return 'neutral';
}
