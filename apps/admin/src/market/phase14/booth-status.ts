import type { SpaceAssignment, BoothInvoice } from '@market/api';
import type { BoothStatus } from '@market/ui';

export function boothStatus(
  assignment: SpaceAssignment | undefined,
  invoices: BoothInvoice[] = [],
): BoothStatus {
  if (!assignment) return 'available';
  return invoices.some(
    (i) =>
      i.assignmentId === assignment.id &&
      i.status !== 'VOID' &&
      (i.status === 'PAID' || i.billingStatus === 'PAID'),
  )
    ? 'paid'
    : 'assigned';
}
