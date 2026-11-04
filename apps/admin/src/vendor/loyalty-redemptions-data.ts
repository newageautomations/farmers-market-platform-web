import {
  AppError,
  type Customer,
  type LoyaltyRank,
  type LoyaltyRedemption,
} from '@market/api';
import { customerName, readCustomersWorkspace } from './customers-data';
import { localOrderDate } from './orders-data';
import type { VendorService } from './service';

export type RedemptionRow = LoyaltyRedemption & { relationship?: Customer };
export interface RedemptionFilters {
  search: string;
  reward: string;
  status: string;
  period: string;
  range: { from: string; to: string };
  sort: string;
}

/** Complete pages keep the summary independent of the visible table page. */
export async function readRedemptions(
  service: VendorService,
): Promise<RedemptionRow[]> {
  const rows: LoyaltyRedemption[] = [];
  const ranks = new Map<number, LoyaltyRank>();
  const seen = new Set<number>();
  let skip = 0;
  const crm = service.context.permissions.includes('ReadOwnCRM');
  for (;;) {
    const page = await service.loyalty!.overview({ skip, take: 100 });
    if (!Number.isInteger(page.take) || page.take <= 0)
      throw new AppError('conflict');
    for (const row of page.redemptions) {
      if (seen.has(row.id)) throw new AppError('conflict');
      seen.add(row.id);
      rows.push(row);
    }
    for (const rank of page.leaderboard) ranks.set(rank.id, rank);
    if (
      page.redemptions.length < page.take &&
      (!crm || page.leaderboard.length < page.take)
    )
      break;
    skip += page.take;
  }
  const customers =
    crm && rows.length ? await readCustomersWorkspace(service) : [];
  const byCustomer = new Map(
    customers.map((customer) => [String(customer.customerId), customer]),
  );
  return rows.map((row) => {
    const customerId =
      row.wallet_id === undefined
        ? undefined
        : ranks.get(row.wallet_id)?.customerId;
    const relationship = customerId
      ? byCustomer.get(String(customerId))
      : undefined;
    return {
      ...row,
      relationship,
      customer: relationship ? customerName(relationship) : row.customer,
    };
  });
}

export function filterRedemptions(
  rows: readonly RedemptionRow[],
  filters: RedemptionFilters,
  now = new Date(),
) {
  let from = '',
    to = '';
  if (filters.period === 'custom') ({ from, to } = filters.range);
  else if (filters.period !== 'all') {
    const start = new Date(now);
    start.setDate(start.getDate() - Number(filters.period) + 1);
    from = localOrderDate(start);
    to = localOrderDate(now);
  }
  const search = filters.search.trim().toLocaleLowerCase();
  return rows
    .filter((row) => {
      const day = localOrderDate(row.created_at);
      return (
        `${row.customer ?? ''} ${row.terms.name} ${row.order_id}`
          .toLocaleLowerCase()
          .includes(search) &&
        (filters.reward === 'all' || row.terms.name === filters.reward) &&
        (filters.status === 'all' || row.status === filters.status) &&
        (!from || (day >= from && day <= to))
      );
    })
    .sort((a, b) => {
      const difference = Date.parse(a.created_at) - Date.parse(b.created_at);
      return (
        (filters.sort === 'oldest' ? difference : -difference) || b.id - a.id
      );
    });
}

/** Independent in-person sales require an explicit receipt context. */
export async function readRedemptionOrder(
  service: VendorService,
  row: Pick<LoyaltyRedemption, 'vendor_order_id'>,
) {
  if (
    !row.vendor_order_id ||
    !service.context.permissions.includes('ReadOwnOrders')
  )
    return null;
  const order = await service.order(String(row.vendor_order_id));
  const sale =
    order.portion.kind === 'IN_PERSON' &&
    service.pos &&
    service.context.permissions.includes('ReadOwnVendorFinance')
      ? await service.pos.orderPayment(order.portion.operationalOrderId)
      : null;
  const market =
    order.portion.marketName ||
    (sale?.context.kind === 'MARKET' ? sale.context.label : null);
  const location =
    market ||
    (sale?.context.kind === 'INDEPENDENT'
      ? 'Independent sale'
      : order.portion.kind === 'DIRECT_VENDOR'
        ? 'Independent sale'
        : 'Unavailable');
  return { order, sale, location };
}

export const redemptionStatuses: Record<string, string> = {
  COMPLETED: 'Redeemed',
  SELECTED: 'Selected',
  RESERVED: 'Reserved',
  CANCELLED: 'Cancelled',
  REVERSED: 'Reversed',
};

/** Sum each completed purchase once, keeping unknown totals out of numeric claims. */
export async function readRedemptionSpending(
  service: VendorService,
  rows: readonly LoyaltyRedemption[],
) {
  const orders = [
    ...new Map(
      rows
        .filter((row) => row.status === 'COMPLETED' && row.vendor_order_id)
        .map((row) => [row.vendor_order_id!, row]),
    ).values(),
  ];
  const totals = new Map<number, number>();
  for (let index = 0; index < orders.length; index += 8) {
    await Promise.all(
      orders.slice(index, index + 8).map(async (row) => {
        try {
          const details = await readRedemptionOrder(service, row);
          const currency =
            details?.sale?.currency ?? details?.order.context?.currency;
          const amount =
            details?.sale?.amount ?? details?.order.context?.original;
          if (currency === 'USD' && typeof amount === 'number')
            totals.set(row.vendor_order_id!, amount);
        } catch {
          /* A missing purchase total must not hide the redemption history. */
        }
      }),
    );
  }
  return totals;
}
