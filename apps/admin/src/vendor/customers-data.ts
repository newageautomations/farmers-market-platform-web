import { safeError, type Customer, type Purchase } from '@market/api';
import { formatMoney } from '@market/config';
import type { VendorService } from './service';

export interface CustomerFilters {
  search: string;
  segment: string;
  activity: string;
  orders: string;
  sort: string;
}

export async function readCustomersWorkspace(service: VendorService) {
  const customers: Customer[] = [];
  let total = 0;
  do {
    const page = await service.customers({
      skip: customers.length,
      take: 100,
      search: null,
    });
    customers.push(...page.items);
    total = page.totalItems;
    if (!page.items.length) break;
  } while (customers.length < total);
  return customers;
}

export function customerName(customer: Customer) {
  return `${customer.firstName} ${customer.lastName}`.trim() || 'Customer';
}

export function newThisMonth(customer: Customer, now = new Date()) {
  const first = new Date(customer.firstActivityAt);
  return (
    first.getFullYear() === now.getFullYear() &&
    first.getMonth() === now.getMonth() &&
    first <= now
  );
}

export function filterCustomers(
  customers: readonly Customer[],
  filters: CustomerFilters,
  now = new Date(),
) {
  const search = filters.search.trim().toLocaleLowerCase();
  const since = new Date(now);
  since.setHours(0, 0, 0, 0);
  if (filters.activity === 'month') since.setDate(1);
  else if (filters.activity !== 'all')
    since.setDate(since.getDate() - Number(filters.activity) + 1);
  return customers
    .filter(
      (customer) =>
        `${customerName(customer)} ${customer.emailAddress}`
          .toLocaleLowerCase()
          .includes(search) &&
        (filters.segment === 'all' ||
          (filters.segment === 'repeat' && customer.purchaseCount > 1) ||
          (filters.segment === 'new' && newThisMonth(customer, now))) &&
        (filters.orders === 'all' ||
          (filters.orders === 'has'
            ? customer.purchaseCount > 0
            : customer.purchaseCount === 0)) &&
        (filters.activity === 'all' ||
          (new Date(customer.lastActivityAt) >= since &&
            new Date(customer.lastActivityAt) <= now)),
    )
    .sort((a, b) => {
      const name = customerName(a).localeCompare(customerName(b), undefined, {
        numeric: true,
      });
      if (filters.sort === 'name-desc') return -name;
      if (filters.sort === 'recent')
        return (
          Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt) || name
        );
      if (filters.sort === 'orders')
        return b.purchaseCount - a.purchaseCount || name;
      return name;
    });
}

// Attribution stays separated by currency. Never combine unlike monetary units.
export function customerSpend(customer: Customer) {
  return (
    customer.attribution
      .map((amount) => formatMoney(amount.original, amount.currency))
      .join(' · ') || 'Unavailable'
  );
}

export function averageCustomerSpend(customers: readonly Customer[]) {
  const totals = new Map<string, { amount: number; count: number }>();
  for (const customer of customers) {
    for (const amount of customer.attribution) {
      const total = totals.get(amount.currency) ?? { amount: 0, count: 0 };
      total.amount += amount.original;
      total.count += 1;
      totals.set(amount.currency, total);
    }
  }
  return (
    [...totals]
      .map(([currency, total]) =>
        formatMoney(Math.round(total.amount / total.count), currency),
      )
      .join(' · ') || 'Unavailable'
  );
}

export async function readCustomerPreviews(
  service: VendorService,
  customers: readonly Customer[],
) {
  const previews = new Map<
    string,
    {
      items?: readonly Purchase[];
      error?: ReturnType<typeof safeError>;
    }
  >();
  // Read only the current table page, using the existing CRM authority and history ordering.
  for (let index = 0; index < customers.length; index += 4) {
    await Promise.all(
      customers.slice(index, index + 4).map(async (customer) => {
        if (!customer.purchaseCount) {
          previews.set(customer.id, { items: [] });
          return;
        }
        try {
          const page = await service.history(customer.customerId, {
            skip: 0,
            take: 3,
            search: null,
          });
          previews.set(customer.id, { items: page.items });
        } catch (error) {
          previews.set(customer.id, { error: safeError(error) });
        }
      }),
    );
  }
  return previews;
}

export function customersCsv(customers: readonly Customer[]) {
  const cell = (value: string | number) => {
    const safe = String(value).replace(/^[=+@\-\t\r]/, "'$&");
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return [
    ['Customer', 'Orders', 'Currency', 'Total spent', 'Last activity'],
    ...customers.flatMap((customer) =>
      (customer.attribution.length ? customer.attribution : [null]).map(
        (amount) => [
          customerName(customer),
          customer.purchaseCount,
          amount?.currency ?? '',
          amount ? (amount.original / 100).toFixed(2) : '',
          customer.lastActivityAt,
        ],
      ),
    ),
  ]
    .map((row) => row.map(cell).join(','))
    .join('\r\n');
}

export function customerTrend(current: number, previous: number) {
  if (current === previous)
    return { direction: 'neutral', label: 'No change from last month' };
  const direction = current > previous ? 'up' : 'down';
  if (!previous) return { direction, label: 'Up from 0 last month' };
  const percent = Math.abs(((current - previous) / previous) * 100);
  return {
    direction,
    label: `${direction === 'up' ? 'Up' : 'Down'} ${percent.toLocaleString(undefined, { maximumFractionDigits: 1 })}% from last month`,
  };
}

export async function readCustomerTrends(
  service: VendorService,
  customers: readonly Customer[],
  now = new Date(),
) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousCustomers = customers.filter(
    (customer) => new Date(customer.firstActivityAt) < start,
  );
  const previousNew = previousCustomers.filter(
    (customer) => new Date(customer.firstActivityAt) >= previousStart,
  ).length;
  let previousRepeat = 0;
  const previousAmounts = new Map<
    string,
    { amount: number; customers: number }
  >();
  // Complete authorized history is required to reconstruct last month's cumulative snapshot.
  for (let index = 0; index < customers.length; index += 4) {
    await Promise.all(
      customers.slice(index, index + 4).map(async (customer) => {
        if (!customer.purchaseCount) return;
        const purchases: Purchase[] = [];
        let total = 0;
        do {
          const page = await service.history(customer.customerId, {
            skip: purchases.length,
            take: 100,
            search: null,
          });
          purchases.push(...page.items);
          total = page.totalItems;
          if (!page.items.length && purchases.length < total)
            throw new Error('Incomplete purchase history');
        } while (purchases.length < total);
        const previous = purchases.filter(
          (purchase) => new Date(purchase.purchasedAt) < start,
        );
        if (previous.length > 1) previousRepeat += 1;
        const amounts = new Map<string, number>();
        for (const purchase of previous)
          amounts.set(
            purchase.currency,
            (amounts.get(purchase.currency) ?? 0) + purchase.original,
          );
        for (const [currency, amount] of amounts) {
          const value = previousAmounts.get(currency) ?? {
            amount: 0,
            customers: 0,
          };
          value.amount += amount;
          value.customers += 1;
          previousAmounts.set(currency, value);
        }
      }),
    );
  }
  const currentAmounts = new Map<
    string,
    { amount: number; customers: number }
  >();
  for (const customer of customers)
    for (const amount of customer.attribution) {
      const value = currentAmounts.get(amount.currency) ?? {
        amount: 0,
        customers: 0,
      };
      value.amount += amount.original;
      value.customers += 1;
      currentAmounts.set(amount.currency, value);
    }
  // An arrow cannot represent a combined percentage across different currencies.
  const currency =
    currentAmounts.size === 1 ? [...currentAmounts.keys()][0] : undefined;
  const currentAmount = currency ? currentAmounts.get(currency) : undefined;
  const previousAmount = currency ? previousAmounts.get(currency) : undefined;
  return [
    customerTrend(customers.length, previousCustomers.length),
    customerTrend(
      customers.filter((customer) => newThisMonth(customer, now)).length,
      previousNew,
    ),
    customerTrend(
      customers.filter((customer) => customer.purchaseCount > 1).length,
      previousRepeat,
    ),
    currentAmount &&
    (previousAmounts.size === 0 ||
      (previousAmounts.size === 1 && !!previousAmount))
      ? customerTrend(
          currentAmount.amount / currentAmount.customers,
          previousAmount ? previousAmount.amount / previousAmount.customers : 0,
        )
      : {
          direction: 'neutral',
          label: 'Comparison unavailable across currencies',
        },
  ];
}
