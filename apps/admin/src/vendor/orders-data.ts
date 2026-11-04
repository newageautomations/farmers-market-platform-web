import type { PosSale } from '@market/api';
import { formatMoney } from '@market/config';
import {
  readOrderSummaries,
  pickupState,
  type PickupOrder,
  type CustomerOrderScope,
} from './pickup-data';
import type { VendorService } from './service';
import { vendorOrderStatus } from './order-presentation';

export interface OrdersRow extends PickupOrder {
  sale: PosSale | null;
}

export async function readOrdersWorkspace(
  service: VendorService,
  scope?: CustomerOrderScope,
): Promise<OrdersRow[]> {
  const orders = await readOrderSummaries(service, 'all', scope);
  const rows: OrdersRow[] = [];
  // Receipt reads remain finance-gated and bounded in flight.
  for (let index = 0; index < orders.length; index += 8) {
    rows.push(
      ...(await Promise.all(
        orders.slice(index, index + 8).map(async (order) => {
          const sale =
            order.portion.kind === 'IN_PERSON' &&
            service.pos &&
            service.context.permissions.includes('ReadOwnVendorFinance')
              ? await service.pos.orderPayment(order.portion.operationalOrderId)
              : null;
          return {
            ...order,
            sale,
            customer: sale?.customer || order.customer,
            orderCode: sale?.orderCode || order.orderCode,
          };
        }),
      )),
    );
  }
  return rows;
}

export function orderSaleType(order: OrdersRow) {
  if (order.portion.kind === 'IN_PERSON') {
    if (order.sale?.context.kind === 'INDEPENDENT') return 'Independent Sale';
    if (order.sale) return 'Market Sale';
    return 'In-person Sale';
  }
  return order.portion.kind === 'MARKET_OCCURRENCE'
    ? 'Market Pickup'
    : 'Online Order';
}

export function orderPayment(order: OrdersRow) {
  // Operational fulfillment state alone is not evidence of payment.
  const value =
    order.sale?.financialStatus ??
    order.payment?.financialStatus ??
    order.context?.financialStatus;
  if (!value)
    return { value: 'unknown', label: 'Unavailable', tone: 'neutral' as const };
  const status = vendorOrderStatus('payment', value);
  if (value === 'UNPAID')
    return { value, label: 'Unpaid', tone: 'danger' as const };
  if (value === 'CASH_DUE')
    return { value, label: 'Cash Due', tone: 'warning' as const };
  if (['PARTIAL', 'PARTIALLY_PAID'].includes(value))
    return { value, label: 'Partial', tone: 'warning' as const };
  if (value === 'REFUNDED')
    return { value, label: status.label, tone: 'danger' as const };
  return { value, ...status };
}

export function orderPickup(order: OrdersRow) {
  return order.portion.kind === 'IN_PERSON'
    ? 'Not Applicable'
    : pickupState(order);
}

export function orderTotal(order: OrdersRow) {
  const payment = order.payment ?? order.context;
  return order.sale
    ? formatMoney(order.sale.amount, order.sale.currency as 'USD')
    : payment
      ? formatMoney(payment.original, payment.currency as 'USD')
      : 'Unavailable';
}

/** Browser-local calendar dates avoid UTC slicing and daylight-saving shifts. */
export function localOrderDate(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export interface OrderFilters {
  search: string;
  market: string;
  occurrence: string;
  range: string;
  custom: { from: string; to: string };
  saleType: string;
  payment: string;
  pickup: string;
  sort: string;
}

export function filterOrders(
  orders: OrdersRow[],
  filters: OrderFilters,
  now = new Date(),
) {
  let from = '',
    to = '';
  if (filters.range === 'custom') ({ from, to } = filters.custom);
  else if (filters.range !== 'all') {
    const start = new Date(now);
    start.setDate(start.getDate() - Number(filters.range) + 1);
    from = localOrderDate(start);
    to = localOrderDate(now);
  }
  return orders
    .filter((order) => {
      const placed = order.portion.placedAt
        ? localOrderDate(order.portion.placedAt)
        : '';
      const search = [
        order.customer,
        order.orderCode,
        order.portion.operationalOrderId,
        order.sale?.cashierId,
      ]
        .join(' ')
        .toLowerCase();
      return (
        search.includes(filters.search.trim().toLowerCase()) &&
        (filters.market === 'all' ||
          (order.portion.marketId ?? order.sale?.context.marketId) ===
            filters.market) &&
        (filters.occurrence === 'all' ||
          (order.portion.occurrenceId ?? order.sale?.context.occurrenceId) ===
            filters.occurrence) &&
        (!from || (!!placed && placed >= from && placed <= to)) &&
        (filters.saleType === 'all' ||
          orderSaleType(order) === filters.saleType) &&
        (filters.payment === 'all' ||
          orderPayment(order).value === filters.payment) &&
        (filters.pickup === 'all' || orderPickup(order) === filters.pickup)
      );
    })
    .sort((a, b) => {
      const difference =
        (Date.parse(a.portion.placedAt ?? '') || 0) -
        (Date.parse(b.portion.placedAt ?? '') || 0);
      return (
        (filters.sort === 'oldest' ? difference : -difference) ||
        a.portion.operationalOrderId.localeCompare(
          b.portion.operationalOrderId,
          undefined,
          { numeric: true },
        )
      );
    });
}

/** Quote CSV cells and prevent spreadsheet formula execution from customer input. */
export function ordersCsv(orders: OrdersRow[]) {
  const cell = (value: string) =>
    `"${(/^[\s]*[=+@-]/.test(value) ? "'" : '') + value.replaceAll('"', '""')}"`;
  return (
    '\uFEFF' +
    [
      [
        'Order',
        'Cashier reference',
        'Customer',
        'Context',
        'Market',
        'Market date',
        'Payment status',
        'Pickup status',
        'Total',
        'Created',
      ],
      ...orders.map((order) => [
        order.orderCode,
        order.sale?.cashierId ?? '',
        order.customer,
        orderSaleType(order),
        order.portion.marketName ?? order.sale?.context.label ?? '',
        order.portion.occurrenceStartsAt ?? '',
        orderPayment(order).label,
        orderPickup(order),
        orderTotal(order),
        order.portion.placedAt ?? '',
      ]),
    ]
      .map((row) => row.map(cell).join(','))
      .join('\r\n')
  );
}
