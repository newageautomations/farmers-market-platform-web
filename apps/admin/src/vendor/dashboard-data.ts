import type {
  ApplicantApplicationRow,
  ComplianceData,
  Customer,
  FinanceActivity,
  FinanceOrderTransaction,
  FinanceReport,
  PackingView,
  VendorBoothAssignment,
} from '@market/api';
import { formatMoney } from '@market/config';
import { hasPermission } from '@market/auth';
import type { VendorService } from './service';
import { customerName } from './customers-data';
import { localOrderDate } from './orders-data';
import type { FarmstandIconName } from '@market/ui/farmstand';
import {
  dateAttendance,
  marketDate,
  type UpcomingMarketDate,
} from './markets-data';

/** Dashboard reporting windows, in account-local days ending today. */
export type DashboardPeriod = '7' | '30' | '90';
export const dashboardPeriods: Array<[DashboardPeriod, string]> = [
  ['7', 'Last 7 days'],
  ['30', 'Last 30 days'],
  ['90', 'Last 90 days'],
];

/** Calendar date `days` before an inclusive ISO `date`. */
export function shiftDate(date: string, days: number) {
  return new Date(Date.parse(date + 'T00:00:00Z') + days * 86400000)
    .toISOString()
    .slice(0, 10);
}

export interface PeriodChange {
  text: string;
  /** Favourable, unfavourable or neutral, for colouring only. */
  tone: 'positive' | 'negative' | 'neutral';
}
/**
 * Compares the current window with the previous window of equal length. A
 * zero baseline with new activity is labelled rather than given an invented
 * percentage.
 */
export function periodChange(
  current: number,
  previous: number,
  period: DashboardPeriod,
): PeriodChange {
  const against = `vs previous ${period} days`;
  if (current === previous)
    return { text: `No change ${against}`, tone: 'neutral' };
  if (previous === 0)
    return { text: `No prior-period baseline`, tone: 'neutral' };
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return {
    text: `${change > 0 ? '↑' : '↓'} ${Math.abs(change).toLocaleString(undefined, { maximumFractionDigits: 1 })}% ${against}`,
    tone: change > 0 ? 'positive' : 'negative',
  };
}

export const channelLabels: Record<string, string> = {
  MARKET_OCCURRENCE: 'Market preorders',
  IN_PERSON: 'In person',
  DIRECT_VENDOR: 'Online orders',
};
export function channelLabel(channel?: string | null) {
  return (channel && channelLabels[channel]) || 'Other';
}

const sales = (report: FinanceReport) =>
  report.transactions.filter((t) => t.kind === 'SALE');

/** Gross sales by checkout channel, largest first. */
export function salesByChannel(report: FinanceReport) {
  const totals = new Map<string, number>();
  for (const t of sales(report)) {
    const key = t.channel && channelLabels[t.channel] ? t.channel : 'OTHER';
    totals.set(key, (totals.get(key) ?? 0) + t.gross);
  }
  return [...totals]
    .map(([id, value]) => ({ id, name: channelLabel(id), value }))
    .sort((a, b) => b.value - a.value);
}

/** Gross sales by attributed market; unattributed sales are independent. */
export function salesByMarket(
  report: FinanceReport,
  marketName: (id: string) => string | undefined,
) {
  const totals = new Map<string, number>();
  for (const t of sales(report)) {
    const key =
      t.marketId && t.marketId !== 'UNATTRIBUTED' ? t.marketId : 'INDEPENDENT';
    totals.set(key, (totals.get(key) ?? 0) + t.gross);
  }
  return [...totals]
    .map(([id, value]) => ({
      id,
      name:
        id === 'INDEPENDENT'
          ? 'Independent sales'
          : (marketName(id) ?? `Market ${id}`),
      value,
    }))
    .sort((a, b) => b.value - a.value);
}

/** Products by units sold in the period, then by revenue. */
export function topProducts(report: FinanceReport, limit = 5) {
  return [...report.products]
    .filter((p) => p.units > 0)
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
    .slice(0, limit);
}

export function recentOrders(report: FinanceReport, limit = 5) {
  return [...(report.orderTransactions ?? [])]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

/** Channel of an order's sale lines when the order projection omits it. */
export function orderChannel(
  report: FinanceReport,
  order: { id: string; channel?: FinanceActivity['channel'] },
) {
  return (
    order.channel ??
    report.transactions.find((t) => t.orderId === order.id && t.channel)
      ?.channel
  );
}

export interface CustomerSpend {
  customer: Customer;
  /** Paid minus refunded, in the report currency's minor units. */
  amount: number;
  orders: number;
}
export interface PeriodCustomers {
  ranking: CustomerSpend[];
  /** Customer name by operational order ID, for orders in the period. */
  orderNames: Map<string, string>;
  /** True when some active customers were not read (bounded reads). */
  partial: boolean;
}
/**
 * Spending per customer in the period, from CRM purchase history (CRM grant
 * only). Only customers active since `since` are read, newest first and
 * bounded in number and in flight.
 */
export async function readPeriodCustomers(
  service: VendorService,
  customers: readonly Customer[],
  since: string,
  currency: string,
  maxCustomers = 60,
): Promise<PeriodCustomers> {
  const inPeriod = (date: string) => localOrderDate(date) >= since;
  const active = customers
    .filter((c) => c.purchaseCount > 0 && inPeriod(c.lastActivityAt))
    .sort(
      (a, b) => Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt),
    );
  const read = active.slice(0, maxCustomers);
  const ranking: CustomerSpend[] = [];
  const orderNames = new Map<string, string>();
  for (let index = 0; index < read.length; index += 4)
    await Promise.all(
      read.slice(index, index + 4).map(async (customer) => {
        let amount = 0,
          orders = 0,
          skip = 0;
        for (let page = 0; page < 5; page += 1) {
          const result = await service.history(customer.customerId, {
            skip,
            take: 100,
            search: null,
          });
          for (const purchase of result.items) {
            if (!inPeriod(purchase.purchasedAt)) continue;
            orderNames.set(purchase.operationalOrderId, customerName(customer));
            if (purchase.currency !== currency) continue;
            amount += purchase.original - purchase.refunded;
            orders += 1;
          }
          skip += result.items.length;
          if (!result.items.length || skip >= result.totalItems) break;
        }
        if (orders) ranking.push({ customer, amount, orders });
      }),
    );
  ranking.sort((a, b) => b.amount - a.amount || b.orders - a.orders);
  return { ranking, orderNames, partial: active.length > read.length };
}

/**
 * Customer names for recent orders: CRM names from the period read, then the
 * finance-gated receipt customer for in-person sales. Unmatched orders are
 * absent from the result.
 */
export async function readOrderCustomers(
  service: VendorService,
  report: FinanceReport,
  orders: readonly FinanceOrderTransaction[],
  known: ReadonlyMap<string, string> | undefined,
) {
  const names = new Map<string, string>();
  for (const order of orders) {
    const name = order.orderId && known?.get(order.orderId);
    if (name) names.set(order.id, name);
  }
  if (
    service.pos &&
    hasPermission(service.context.permissions, 'ReadOwnVendorFinance')
  )
    for (const order of orders) {
      if (names.has(order.id) || !order.orderId) continue;
      if (orderChannel(report, order) !== 'IN_PERSON') continue;
      const sale = await service.pos.orderPayment(order.orderId);
      if (sale?.customer) names.set(order.id, sale.customer);
    }
  return names;
}

/** Label for an order whose customer is not known to this account. */
export function unknownCustomer(channel?: string | null) {
  return channel === 'IN_PERSON' ? 'Walk-in customer' : 'Customer';
}

export interface CustomerActivity {
  total: number;
  newCustomers: number;
  previousNew: number;
  repeat: number;
  oneTime: number;
}
/** CRM relationship counts; `since`/`before` are inclusive ISO dates. */
export function customerActivity(
  customers: readonly Customer[],
  since: string,
  previousSince: string,
): CustomerActivity {
  const day = (value: string) => value.slice(0, 10);
  const buyers = customers.filter((c) => c.purchaseCount > 0);
  return {
    total: customers.length,
    newCustomers: customers.filter((c) => day(c.firstActivityAt) >= since)
      .length,
    previousNew: customers.filter(
      (c) =>
        day(c.firstActivityAt) >= previousSince &&
        day(c.firstActivityAt) < since,
    ).length,
    repeat: buyers.filter((c) => c.purchaseCount > 1).length,
    oneTime: buyers.filter((c) => c.purchaseCount === 1).length,
  };
}

export type UrgentTone = 'danger' | 'warning' | 'info';
export interface UrgentItem {
  id: string;
  tone: UrgentTone;
  icon: FarmstandIconName;
  title: string;
  detail: string;
  href: string;
  /** Sort key: earlier deadlines first; undefined deadlines last. */
  due?: string;
}

const day = 86400000;
export function daysUntil(date: string, now: number) {
  const today = new Date(now);
  const start = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return Math.round(
    (Date.parse(date.slice(0, 10) + 'T00:00:00Z') - start) / day,
  );
}
function longDate(date: string) {
  return new Date(date.slice(0, 10) + 'T12:00:00Z').toLocaleDateString(
    undefined,
    { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' },
  );
}
function inDays(days: number) {
  return days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
}
const datePath = (date: UpcomingMarketDate) =>
  `/vendor/markets/${encodeURIComponent(date.membership.id)}/dates/${encodeURIComponent(date.occurrence.id)}`;

/** Library documents and Market requests that need the vendor's action. */
export function documentUrgencies(
  data: ComplianceData,
  now: number,
): UrgentItem[] {
  const items: UrgentItem[] = [];
  for (const doc of data.documents) {
    const expires = doc.metadata.expiresOn;
    if (doc.expiration === 'Expired')
      items.push({
        id: `document:${doc.id}`,
        tone: 'danger',
        icon: 'triangle-alert',
        title: `${doc.metadata.title} expired`,
        detail: expires
          ? `Expired ${longDate(expires)}. Upload a current version.`
          : 'Upload a current version.',
        href: '/vendor/documents',
        due: expires ?? undefined,
      });
    else if (doc.expiration === 'Expiring Soon' && expires)
      items.push({
        id: `document:${doc.id}`,
        tone: 'warning',
        icon: 'receipt-text',
        title: `${doc.metadata.title} expiring soon`,
        detail: `Expires ${inDays(daysUntil(expires, now))} (${longDate(expires)}).`,
        href: '/vendor/documents',
        due: expires,
      });
  }
  for (const request of data.requests) {
    if (!request.required || request.waived) continue;
    const href = `/vendor/documents?view=requests&market=${request.market_id}`;
    const due = request.due_on ? ` Due ${longDate(request.due_on)}.` : '';
    if (request.status === 'Rejected')
      items.push({
        id: `request:${request.id}`,
        tone: 'danger',
        icon: 'triangle-alert',
        title: `${request.title} needs a new submission`,
        detail: `${request.market_name} rejected your submission.${due}`,
        href,
        due: request.due_on ?? undefined,
      });
    else if (['Missing', 'Expired', 'Access revoked'].includes(request.status))
      items.push({
        id: `request:${request.id}`,
        tone:
          request.status === 'Expired' ||
          (request.due_on && daysUntil(request.due_on, now) < 0)
            ? 'danger'
            : 'warning',
        icon: 'receipt-text',
        title: `${request.market_name} needs ${request.title}`,
        detail:
          (request.status === 'Expired'
            ? 'Your shared document has expired.'
            : 'Required document not yet submitted.') + due,
        href,
        due: request.due_on ?? undefined,
      });
  }
  return items;
}

/** Upcoming dates in the next two weeks without an attendance response. */
export function attendanceUrgencies(
  dates: readonly UpcomingMarketDate[],
  now: number,
): UrgentItem[] {
  return dates
    .filter(
      (d) =>
        dateAttendance(d.participation) === 'needs-rsvp' &&
        Date.parse(d.occurrence.startsAt) - now < 14 * day,
    )
    .map((d) => ({
      id: `rsvp:${d.key}`,
      tone: 'warning' as const,
      icon: 'calendar-days' as const,
      title: `Confirm attendance: ${d.membership.market.name}`,
      detail: `${marketDate(d.occurrence, true)} has no attendance response.`,
      href: datePath(d),
      due: d.occurrence.startsAt,
    }));
}

/** Open booth invoices with a balance, matched to their market date when known. */
export function boothFeeUrgencies(
  assignments: ReadonlyMap<string, VendorBoothAssignment> | undefined,
  dates: readonly UpcomingMarketDate[],
): UrgentItem[] {
  if (!assignments) return [];
  const items: UrgentItem[] = [];
  for (const [occurrenceId, assignment] of assignments)
    for (const invoice of assignment.invoices) {
      const balance = invoice.totalMinor - invoice.paidMinor;
      if (!['OPEN', 'PAST_DUE'].includes(invoice.status) || balance <= 0)
        continue;
      const date = dates.find((d) => String(d.occurrence.id) === occurrenceId);
      items.push({
        id: `invoice:${invoice.id}`,
        tone: invoice.status === 'PAST_DUE' ? 'danger' : 'warning',
        icon: 'credit-card',
        title:
          invoice.status === 'PAST_DUE'
            ? 'Booth fee past due'
            : 'Booth fee due',
        detail: `${formatMoney(balance, invoice.currency)} due${
          date
            ? ` for ${date.membership.market.name} (${marketDate(date.occurrence)})`
            : ` for booth ${assignment.space.label}`
        }.`,
        href: date ? datePath(date) : '/vendor/markets#upcoming-dates',
        due: assignment.startsAt,
      });
    }
  return items;
}

/** Applications where the market is waiting on the vendor. */
export function applicationUrgencies(
  rows: readonly ApplicantApplicationRow[],
): UrgentItem[] {
  return rows
    .filter((row) => row.status === 'NEEDS_INFO')
    .map((row) => ({
      id: `application:${row.id}`,
      tone: 'warning' as const,
      icon: 'info' as const,
      title: 'Application information requested',
      detail: `${row.marketName} needs more information before deciding.`,
      href: `/vendor/applications/${row.id}`,
    }));
}

export function linkUrgencies(
  requests: ReadonlyArray<{ id: number; marketName: string }>,
): UrgentItem[] {
  return requests.map((request) => ({
    id: `link:${request.id}`,
    tone: 'info' as const,
    icon: 'store' as const,
    title: 'Market link request',
    detail: `${request.marketName} asked to link your business.`,
    href: '/vendor/markets',
  }));
}

const toneRank: Record<UrgentTone, number> = { danger: 0, warning: 1, info: 2 };
export function sortUrgent(items: UrgentItem[]) {
  return items.sort(
    (a, b) =>
      toneRank[a.tone] - toneRank[b.tone] ||
      (a.due ?? '￿').localeCompare(b.due ?? '￿'),
  );
}

export interface WeekTask {
  id: string;
  label: string;
  detail?: string;
  done: boolean;
  href: string;
}
/**
 * The next seven days' work, derived from authoritative records. A task is
 * done only when its record says so; the dashboard never stores checkmarks.
 */
export function weekTasks({
  dates,
  packing,
  urgent,
  now,
}: {
  dates: readonly UpcomingMarketDate[];
  packing: ReadonlyMap<string, PackingView>;
  urgent: readonly UrgentItem[];
  now: number;
}): WeekTask[] {
  const tasks: WeekTask[] = [];
  for (const date of dates) {
    if (Date.parse(date.occurrence.startsAt) - now >= 7 * day) continue;
    const attendance = dateAttendance(date.participation);
    if (attendance === 'not-attending') continue;
    const when = marketDate(date.occurrence);
    tasks.push({
      id: `attend:${date.key}`,
      label: `Confirm attendance for ${date.membership.market.name}`,
      detail: when,
      done: attendance === 'attending',
      href: datePath(date),
    });
    const view = packing.get(String(date.occurrence.id));
    if (view && view.customers.length > 0)
      tasks.push({
        id: `pack:${date.key}`,
        label: `Pack preorders for ${date.membership.market.name}`,
        detail:
          view.summary.customersRemaining > 0
            ? `${view.summary.customersRemaining} of ${view.customers.length} customers left`
            : `${view.customers.length} ready`,
        done: view.summary.customersRemaining === 0,
        href: `/vendor/orders/packing?occurrence=${encodeURIComponent(date.occurrence.id)}`,
      });
  }
  for (const item of urgent)
    if (
      item.id.startsWith('invoice:') ||
      (item.due && daysUntil(item.due, now) <= 7)
    )
      tasks.push({
        id: `urgent:${item.id}`,
        label: item.title,
        detail: item.detail,
        done: false,
        href: item.href,
      });
  // Open work first; completed tasks stay visible as progress.
  return tasks.sort((a, b) => Number(a.done) - Number(b.done));
}
