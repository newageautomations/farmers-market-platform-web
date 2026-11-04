import { AppError, type PackingView, type Purchase } from '@market/api';
import { mayCommand } from '@market/admin-core';
import type { OrderView, VendorService } from './service';

export interface PickupOrder extends OrderView {
  customer: string;
  orderCode: string;
  payment: Purchase | null;
  packed: boolean;
  itemDetails?: Record<string, { name: string; image: string | null }>;
}

export interface CustomerOrderScope {
  customer: string;
  purchases: readonly Purchase[];
}

async function allPages<T>(
  read: (skip: number) => Promise<{ items: readonly T[]; totalItems: number }>,
) {
  const items: T[] = [];
  for (;;) {
    const page = await read(items.length);
    items.push(...page.items);
    if (items.length >= page.totalItems) return items;
    if (!page.items.length) throw new AppError('conflict');
  }
}

/** Shared identity, financial attribution and packing projection for order queues. */
export async function readOrderSummaries(
  service: VendorService,
  kind: 'all' | 'MARKET_OCCURRENCE',
  scope?: CustomerOrderScope,
): Promise<PickupOrder[]> {
  const orders = await allPages((skip) => service.orders(skip, kind));
  const identities = new Map<string, { customer: string; payment: Purchase }>();
  if (scope) {
    for (const payment of scope.purchases)
      identities.set(payment.operationalOrderId, {
        customer: scope.customer,
        payment,
      });
  } else if (service.context.permissions.includes('ReadOwnCRM')) {
    const customers = await allPages((skip) =>
      service.customers({ skip, take: 20, search: '' }),
    );
    // Keep reads bounded in flight, and join only by authoritative operational IDs.
    for (let index = 0; index < customers.length; index += 8) {
      const batch = await Promise.all(
        customers.slice(index, index + 8).map(async (customer) => ({
          customer,
          purchases: await allPages((skip) =>
            service.history(customer.customerId, {
              skip,
              take: 20,
              search: '',
            }),
          ),
        })),
      );
      for (const { customer, purchases } of batch)
        for (const payment of purchases)
          identities.set(payment.operationalOrderId, {
            customer:
              `${customer.firstName} ${customer.lastName}`.trim() || 'Customer',
            payment,
          });
    }
  }
  let result: PickupOrder[] = orders
    .filter(
      ({ portion }) =>
        (kind === 'all' || portion.kind === kind) &&
        (!scope || identities.has(portion.operationalOrderId)),
    )
    .map((order) => {
      const identity = identities.get(order.portion.operationalOrderId);
      return {
        ...order,
        customer: identity?.customer || 'Customer details unavailable',
        orderCode: order.portion.operationalOrderId,
        payment: identity?.payment ?? null,
        packed: false,
      };
    });
  if (service.packing) {
    const occurrences = await service.packing.occurrences();
    const required = new Set(result.map((order) => order.portion.occurrenceId));
    for (const occurrence of occurrences) {
      if (required.has(String(occurrence.id)))
        result = withPacking(result, await service.packing.read(occurrence.id));
    }
  }
  return result;
}

export async function readPickupOrders(
  service: VendorService,
): Promise<PickupOrder[]> {
  let result = await readOrderSummaries(service, 'MARKET_OCCURRENCE');
  if (service.context.permissions.includes('ReadOwnCatalog')) {
    const catalog = await allPages((skip) => service.catalog('', skip));
    const images = new Map<string, string>();
    const wanted = new Set(
      catalog.flatMap((product) => [
        ...(product.assetIds ?? []),
        ...product.variants.flatMap((variant) => variant.assetIds ?? []),
      ]),
    );
    if (service.categories)
      for (let skip = 0; wanted.size;) {
        const batch = await service.categories.images(skip);
        for (const image of batch)
          if (wanted.delete(image.id)) images.set(image.id, image.preview);
        if (batch.length < 100) break;
        skip += batch.length;
      }
    const itemDetails: NonNullable<PickupOrder['itemDetails']> = {};
    for (const product of catalog)
      for (const variant of product.variants) {
        const asset = variant.assetIds?.[0] ?? product.assetIds?.[0];
        itemDetails[variant.id] = {
          name: product.name,
          image: asset ? (images.get(asset) ?? null) : null,
        };
      }
    result = result.map((order) => ({ ...order, itemDetails }));
  }
  return result;
}

export function withPacking(
  orders: PickupOrder[],
  packing?: PackingView,
): PickupOrder[] {
  return orders.map((order) => {
    const customers = packing?.customers.filter((customer) =>
      customer.items.some((item) =>
        order.portion.lines.some(
          (line) => line.operationalLineId === item.lineId,
        ),
      ),
    );
    const customer = customers?.[0];
    const items = customer?.items.filter((item) =>
      order.portion.lines.some(
        (line) => line.operationalLineId === item.lineId,
      ),
    );
    return {
      ...order,
      customer: customer?.name || order.customer,
      orderCode: items?.[0]?.orderCode || order.orderCode,
      packed: customer ? customer.completed : order.packed,
    };
  });
}

export function pickupState(order: PickupOrder) {
  if (
    order.portion.pickupStatus === 'CANCELLED' ||
    order.portion.nativeState === 'Cancelled'
  )
    return 'Cancelled';
  if (order.portion.pickupStatus === 'COLLECTED') return 'Picked up';
  if (
    order.portion.fulfilledQuantity > 0 ||
    order.portion.pickupStatus === 'PARTIAL'
  )
    return 'Partially fulfilled';
  if (order.packed || order.portion.pickupStatus === 'READY_FOR_PICKUP')
    return 'Ready for Pickup';
  return 'Awaiting Fulfillment';
}

export function canPickup(service: VendorService, order: PickupOrder) {
  return (
    mayCommand(service.context, 'FulfillOwnOrders') &&
    order.portion.kind === 'MARKET_OCCURRENCE' &&
    order.portion.vendorId === service.vendorId &&
    order.portion.remainingQuantity > 0 &&
    [
      'PaymentSettled',
      'PartiallyShipped',
      'Shipped',
      'PartiallyDelivered',
      'Delivered',
    ].includes(order.portion.nativeState)
  );
}

/** Existing per-line commands are sequential, idempotent, and never retried here. */
async function lineOperationKey(
  intent: string,
  orderId: string,
  lineId: string,
) {
  // Stable per intent and line, while retaining the backend's UUID-only contract.
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      'SHA-1',
      new TextEncoder().encode(
        JSON.stringify(['pickup', intent, orderId, lineId]),
      ),
    ),
  );
  const bytes = digest.slice(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function collectPickup(
  service: VendorService,
  displayed: PickupOrder,
  operationKey: string,
) {
  const current = await service.order(displayed.portion.operationalOrderId);
  if (!canPickup(service, { ...displayed, ...current }))
    throw new AppError('conflict');
  const signature = (view: OrderView) =>
    JSON.stringify(
      view.portion.lines.map((line) => [
        line.operationalLineId,
        line.remainingQuantity,
        line.fulfilledQuantity,
        line.cancelledQuantity,
      ]),
    );
  if (signature(current) !== signature(displayed))
    throw new AppError('conflict');
  for (const line of current.portion.lines) {
    if (line.remainingQuantity <= 0) continue;
    await service.fulfill({
      operationKey: await lineOperationKey(
        operationKey,
        current.portion.operationalOrderId,
        line.operationalLineId,
      ),
      orderId: current.portion.operationalOrderId,
      orderLineId: line.operationalLineId,
      quantity: line.remainingQuantity,
      fulfillmentId: null,
    });
  }
}
