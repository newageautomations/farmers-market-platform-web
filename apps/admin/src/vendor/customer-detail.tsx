import { useCallback, useMemo } from 'react';
import {
  AppError,
  type Customer,
  type Purchase,
  type LoyaltyRank,
} from '@market/api';
import { readLoyaltyRanks } from './loyalty-leaderboard-data';
import { UtilityIcon } from '@market/ui';
import { FarmstandIcon, FarmstandPanel } from '@market/ui/farmstand';
import { ReadState, useRead } from './common';
import { customerName, customerSpend } from './customers-data';
import { OrdersWorkspace } from './orders';
import type { OrdersRow } from './orders-data';
import type { VendorService } from './service';
import './customer-detail.css';

export async function readCustomerDetail(service: VendorService, id: string) {
  const customer = await service.customer(id);
  const purchases: Purchase[] = [];
  for (;;) {
    const page = await service.history(customer.customerId, {
      skip: purchases.length,
      take: 100,
      search: null,
    });
    purchases.push(...page.items);
    if (purchases.length >= page.totalItems) break;
    if (!page.items.length) throw new AppError('conflict');
  }
  return { customer, purchases };
}

/** Count purchased units across the full history, excluding cancelled units. */
export function favoriteItem(
  purchases: readonly Purchase[],
  orders: OrdersRow[],
) {
  const quantities = new Map<string, number>();
  for (const purchase of purchases) {
    if (purchase.nativeState === 'Cancelled') continue;
    for (const line of purchase.lines)
      quantities.set(
        line.variantId,
        (quantities.get(line.variantId) ?? 0) +
          Math.max(0, line.quantity - line.cancelledQuantity),
      );
  }
  const favorite = [...quantities]
    .filter(([, quantity]) => quantity > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  if (!favorite) return 'No purchases yet';
  return (
    orders
      .flatMap((order) => order.portion.lines)
      .find((line) => line.variantId === favorite[0])?.variantName ||
    'Unavailable'
  );
}

function customerDate(value: string | undefined) {
  if (!value || Number.isNaN(Date.parse(value))) return 'Unavailable';
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function CustomerSummary({
  customer,
  purchases,
  orders,
  loyalty,
  loyaltyLoading,
}: {
  customer: Customer;
  purchases: readonly Purchase[];
  orders: OrdersRow[] | undefined;
  loyalty?: LoyaltyRank;
  loyaltyLoading: boolean;
}) {
  const lastOrder = purchases.reduce<string | undefined>(
    (latest, purchase) =>
      !latest || Date.parse(purchase.purchasedAt) > Date.parse(latest)
        ? purchase.purchasedAt
        : latest,
    undefined,
  );
  return (
    <div className="customer-detail-summary">
      <header className="order-page-heading">
        <div className="order-heading-title">
          <span className="order-heading-icon">
            <FarmstandIcon name="user-round" />
          </span>
          <div>
            <h1>{customerName(customer)}</h1>
            {customer.emailAddress && (
              <p className="customer-detail-contact">
                <UtilityIcon name="email" />
                {customer.emailAddress}
              </p>
            )}
          </div>
        </div>
      </header>
      <div className="customer-detail-overview">
        <FarmstandPanel className="customer-detail-stat">
          <span className="customer-detail-stat-icon">
            <FarmstandIcon name="credit-card" />
          </span>
          <dl>
            <dt>Total spent</dt>
            <dd>{customerSpend(customer)}</dd>
          </dl>
        </FarmstandPanel>
        <FarmstandPanel className="customer-detail-stat">
          <span className="customer-detail-stat-icon">
            <FarmstandIcon name="shopping-cart" />
          </span>
          <dl>
            <dt>Purchases</dt>
            <dd>
              {customer.purchaseCount.toLocaleString()}{' '}
              {customer.purchaseCount === 1 ? 'order' : 'orders'}
            </dd>
          </dl>
        </FarmstandPanel>
        <FarmstandPanel className="customer-detail-stat">
          <span className="customer-detail-stat-icon customer-detail-loyalty-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-star preview-icon"
              aria-hidden="true"
            >
              <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
            </svg>
          </span>
          <dl>
            <dt>Loyalty points</dt>
            <dd>
              {loyalty
                ? Number(loyalty.earned).toLocaleString()
                : loyaltyLoading
                  ? 'Loading…'
                  : 'Unavailable'}
            </dd>
            {loyalty && (
              <dd className="customer-detail-loyalty-note">
                Net lifetime earned ·{' '}
                {Number(loyalty.available).toLocaleString()} available
              </dd>
            )}
          </dl>
        </FarmstandPanel>
        <FarmstandPanel className="customer-detail-facts">
          <dl>
            <div>
              <dt>
                <FarmstandIcon name="user-round" />
                Customer since
              </dt>
              <dd>{customerDate(customer.firstActivityAt)}</dd>
            </div>
            <div>
              <dt>
                <FarmstandIcon name="calendar-days" />
                Last order
              </dt>
              <dd>
                {purchases.length ? customerDate(lastOrder) : 'No orders yet'}
              </dd>
            </div>
            <div>
              <dt>
                <UtilityIcon name="heart" />
                Favorite item
              </dt>
              <dd>
                {orders
                  ? favoriteItem(purchases, orders)
                  : purchases.length
                    ? 'Unavailable'
                    : 'No purchases yet'}
              </dd>
            </div>
          </dl>
        </FarmstandPanel>
      </div>
    </div>
  );
}

export function CustomerDetail({
  service,
  id,
}: {
  service: VendorService;
  id: string;
}) {
  const read = useCallback(
    () => readCustomerDetail(service, id),
    [service, id],
  );
  const query = useRead(`customer-detail:${service.vendorId}:${id}`, read);
  const readLoyalty = useCallback(() => readLoyaltyRanks(service), [service]);
  const loyalty = useRead(
    `customer-loyalty:${service.vendorId}:${id}`,
    readLoyalty,
    !!service.loyalty && !!query.data,
  );
  const rank = loyalty.data?.find(
    (row) => String(row.customerId) === String(query.data?.customer.customerId),
  );
  const scope = useMemo(
    () =>
      query.data
        ? {
            customer: customerName(query.data.customer),
            purchases: query.data.purchases,
          }
        : undefined,
    [query.data],
  );
  return (
    <>
      <ReadState {...query} retry={query.refresh} />
      {query.data && scope && (
        <OrdersWorkspace
          service={service}
          customerScope={scope}
          header={(orders) => (
            <CustomerSummary
              {...query.data!}
              orders={orders}
              loyalty={rank}
              loyaltyLoading={loyalty.loading}
            />
          )}
        />
      )}
    </>
  );
}
