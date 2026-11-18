import type {
  BoothInvoice,
  ComplianceSummaryData,
  MarketOccurrence,
  MarketOperationsData,
} from '@market/api';
import { formatMoney } from '@market/config';
import {
  daysUntil,
  sortUrgent,
  type UrgentItem,
} from '../vendor/dashboard-data';
import { boothStatus } from './phase14/booth-status';
import { occurrenceBooths } from './phase14/Assignments';
import { plural, type DateOperations } from './operations-data';

export { daysUntil, sortUrgent, type UrgentItem };

export const INVOICES_PATH = '/market/finances/invoices';
export const SUBMISSIONS_PATH = '/market/application-submissions';
export const DOCUMENTS_PATH = '/market/documents';
export const assignmentsPath = (occurrenceId: string | number) =>
  `/market/assignments/${encodeURIComponent(occurrenceId)}`;
export const occurrencePath = (occurrenceId: string | number) =>
  `/market/occurrences/${encodeURIComponent(occurrenceId)}`;

/** Scheduled dates that have not started yet, soonest first. */
export function upcomingDates(
  occurrences: readonly MarketOccurrence[],
  now: number,
) {
  return occurrences
    .filter((o) => o.status === 'scheduled' && Date.parse(o.endsAt) > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function relativeDay(date: string, now: number) {
  const days = daysUntil(date, now);
  return days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
}

/** An unpaid booth invoice with what is still owed. */
export interface DueInvoice {
  invoice: BoothInvoice;
  dueMinor: number;
  pastDue: boolean;
}

/**
 * Issued invoices with a balance, past-due first and then by due date.
 * Drafts are not yet sent to the vendor and void invoices owe nothing.
 */
export function invoicesAwaitingPayment(
  invoices: readonly BoothInvoice[] = [],
): DueInvoice[] {
  return invoices
    .filter((i) => i.status === 'OPEN' && i.totalMinor - i.paidMinor > 0)
    .map((invoice) => ({
      invoice,
      dueMinor: invoice.totalMinor - invoice.paidMinor,
      pastDue: invoice.billingStatus === 'PAST_DUE',
    }))
    .sort(
      (a, b) =>
        Number(b.pastDue) - Number(a.pastDue) ||
        (a.invoice.dueAt ?? '￿').localeCompare(b.invoice.dueAt ?? '￿') ||
        a.invoice.id - b.invoice.id,
    );
}

/** Amount owed per currency, formatted ("$120.00 + CA$40.00"). */
export function owedTotal(due: readonly DueInvoice[]) {
  const sums = new Map<string, number>();
  for (const row of due)
    sums.set(
      row.invoice.currency,
      (sums.get(row.invoice.currency) ?? 0) + row.dueMinor,
    );
  if (!sums.size) return formatMoney(0, 'USD');
  return [...sums]
    .map(([currency, minor]) => formatMoney(minor, currency))
    .join(' + ');
}

/** Booth occupancy for one date from its Assignments read. */
export interface BoothBreakdown {
  layout: boolean;
  total: number;
  /** Assigned booths whose invoice is paid. */
  paid: number;
  /** Assigned booths without a paid invoice. */
  assigned: number;
  open: number;
  /** Confirmed vendors without a booth. */
  unassigned: number;
}
export function boothBreakdown(
  data: MarketOperationsData,
  occurrenceId: number,
): BoothBreakdown {
  const { plan, spaces, assignments, approvals } = occurrenceBooths(
    data,
    occurrenceId,
  );
  let paid = 0;
  let assigned = 0;
  for (const space of spaces) {
    const assignment = assignments.find((a) => a.spaceId === space.id);
    const status = boothStatus(assignment, data.invoices);
    if (status === 'paid') paid++;
    else if (status === 'assigned') assigned++;
  }
  const confirmed = approvals.filter((a) => a.decision === 'CONFIRMED');
  return {
    layout: !!plan,
    total: spaces.length,
    paid,
    assigned,
    open: Math.max(0, spaces.length - paid - assigned),
    unassigned: confirmed.filter(
      (a) => !assignments.some((x) => x.approvalId === a.id),
    ).length,
  };
}

/**
 * What needs the manager now, from reads the account is allowed to make.
 * Each source is optional: a missing grant or failed read adds nothing.
 */
export function managerUrgencies({
  next,
  nextFacts,
  due,
  compliance,
  applications,
  vendorRequests,
  now,
}: {
  next?: MarketOccurrence | null;
  nextFacts?: DateOperations;
  due?: readonly DueInvoice[];
  compliance?: ComplianceSummaryData;
  applications?: number;
  vendorRequests?: number;
  now: number;
}): UrgentItem[] {
  const items: UrgentItem[] = [];
  const pastDue = due?.filter((d) => d.pastDue) ?? [];
  if (pastDue.length)
    items.push({
      id: 'invoices:past-due',
      tone: 'danger',
      icon: 'receipt-text',
      title: `${plural(pastDue.length, 'invoice')} past due`,
      detail: `${owedTotal(pastDue)} owed by ${plural(new Set(pastDue.map((d) => d.invoice.directoryId)).size, 'vendor')}.`,
      href: `${INVOICES_PATH}?status=PAST_DUE&occurrence=all`,
      due: pastDue[0]!.invoice.dueAt ?? undefined,
    });
  if (compliance?.totals.expired)
    items.push({
      id: 'documents:expired',
      tone: 'danger',
      icon: 'file-text',
      title: `${plural(compliance.totals.expired, 'expired document')}`,
      detail: 'Vendors need to upload current versions.',
      href: `${DOCUMENTS_PATH}?view=reports&report=expiration&status=Expired`,
    });
  if (next && nextFacts) {
    const days = daysUntil(next.startsAt, now);
    const when = relativeDay(next.startsAt, now).toLowerCase();
    if (!nextFacts.layout)
      items.push({
        id: 'booths:layout',
        tone: days <= 7 ? 'danger' : 'warning',
        icon: 'map-pin',
        title: 'No booth layout for the next market',
        detail: `Choose a layout for the market ${when} so vendors can be given booths.`,
        href: assignmentsPath(next.id),
        due: next.startsAt,
      });
    else if (nextFacts.unassigned)
      items.push({
        id: 'booths:unassigned',
        tone: days <= 3 ? 'danger' : 'warning',
        icon: 'store',
        title: `${plural(nextFacts.unassigned, 'vendor')} without a booth`,
        detail: `Confirmed for the market ${when} but not assigned yet.`,
        href: assignmentsPath(next.id),
        due: next.startsAt,
      });
  }
  if (compliance?.totals.expiringSoon)
    items.push({
      id: 'documents:expiring',
      tone: 'warning',
      icon: 'file-text',
      title: `${plural(compliance.totals.expiringSoon, 'document')} expiring soon`,
      detail: 'Remind vendors before their documents lapse.',
      href: `${DOCUMENTS_PATH}?view=reports&report=expiration`,
    });
  if (compliance?.totals.pending)
    items.push({
      id: 'documents:pending',
      tone: 'info',
      icon: 'file-check',
      title: `${plural(compliance.totals.pending, 'document')} to review`,
      detail: 'Vendors submitted documents for your approval.',
      href: `${DOCUMENTS_PATH}?view=reports&status=Pending+review`,
    });
  if (applications)
    items.push({
      id: 'applications:review',
      tone: 'info',
      icon: 'clipboard-list',
      title: `${plural(applications, 'application')} to review`,
      detail: 'Submitted and waiting for a decision.',
      href: `${SUBMISSIONS_PATH}?quickView=REVIEW`,
    });
  if (vendorRequests)
    items.push({
      id: 'vendors:pending',
      tone: 'info',
      icon: 'user-round',
      title: `${plural(vendorRequests, 'vendor request')}`,
      detail: 'Vendors asking to join your market.',
      href: '/market/vendors?account=pending',
    });
  return sortUrgent(items);
}
